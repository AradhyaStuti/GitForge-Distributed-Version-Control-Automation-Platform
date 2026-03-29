const crypto = require("crypto");

// ── In-memory fallback store ───────────────────────────────────────────────
const memoryCache = new Map();

// ── Redis client (optional, falls back to in-memory) ───────────────────────
let redisClient = null;
let redisReady = false;

async function initRedis() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;

  try {
    const { createClient } = require("redis");
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", () => { redisReady = false; });
    redisClient.on("ready", () => { redisReady = true; });
    await redisClient.connect();
    redisReady = true;
    console.log("Redis cache connected.");
  } catch {
    redisClient = null;
    redisReady = false;
    console.log("Redis unavailable, using in-memory cache.");
  }
}

// Initialize on load (non-blocking)
initRedis();

// ── Cache get/set abstraction ──────────────────────────────────────────────
async function cacheGet(key) {
  if (redisReady && redisClient) {
    try {
      const raw = await redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      // Fall through to memory
    }
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry;
}

async function cacheSet(key, data, hash, ttl) {
  const entry = { data, hash, timestamp: Date.now(), expiresAt: Date.now() + ttl };

  if (redisReady && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(entry), { PX: ttl });
      return;
    } catch {
      // Fall through to memory
    }
  }
  memoryCache.set(key, entry);
}

async function cacheDel(pattern) {
  // In-memory cleanup
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) memoryCache.delete(key);
  }
  // Redis cleanup
  if (redisReady && redisClient) {
    try {
      const keys = await redisClient.keys(`*${pattern}*`);
      if (keys.length > 0) await redisClient.del(keys);
    } catch {
      // Ignore Redis errors on invalidation
    }
  }
}

// ── Middleware ──────────────────────────────────────────────────────────────
const DEFAULT_TTL = 60 * 1000;

function cacheMiddleware(ttl = DEFAULT_TTL) {
  return (req, res, next) => {
    if (req.method !== "GET") return next();

    const key = `cache:${req.originalUrl}`;

    cacheGet(key).then((cached) => {
      if (cached) {
        const etag = `"${cached.hash}"`;
        res.set("ETag", etag);
        res.set("Cache-Control", `public, max-age=${Math.floor(ttl / 1000)}`);

        if (req.headers["if-none-match"] === etag) {
          return res.status(304).end();
        }

        return res.json(cached.data);
      }

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        const hash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 16);
        cacheSet(key, data, hash, ttl).catch(() => {});

        res.set("ETag", `"${hash}"`);
        res.set("Cache-Control", `public, max-age=${Math.floor(ttl / 1000)}`);
        return originalJson(data);
      };

      next();
    }).catch(() => next());
  };
}

function invalidateCache(pattern) {
  cacheDel(pattern).catch(() => {});
}

module.exports = { cacheMiddleware, invalidateCache };

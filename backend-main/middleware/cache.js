const crypto = require("crypto");

const cache = new Map();
const DEFAULT_TTL = 60 * 1000;

function cacheMiddleware(ttl = DEFAULT_TTL) {
  return (req, res, next) => {
    if (req.method !== "GET") return next();

    const key = `${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
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
      cache.set(key, { data, timestamp: Date.now(), hash });

      res.set("ETag", `"${hash}"`);
      res.set("Cache-Control", `public, max-age=${Math.floor(ttl / 1000)}`);
      return originalJson(data);
    };

    next();
  };
}

function invalidateCache(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

module.exports = { cacheMiddleware, invalidateCache };

const zlib = require("zlib");

const SKIP_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/zip",
  "application/gzip",
  "application/octet-stream",
  "video/mp4",
  "audio/mpeg",
]);

const MIN_SIZE = 1024; // 1KB threshold

/**
 * Response compression middleware using Node.js built-in zlib.
 * Compresses responses larger than 1KB when the client supports gzip or deflate.
 * Skips already-compressed content types (images, archives, etc.).
 */
function compressionMiddleware(req, res, next) {
  const acceptEncoding = req.headers["accept-encoding"] || "";
  const supportsGzip = acceptEncoding.includes("gzip");
  const supportsDeflate = acceptEncoding.includes("deflate");

  if (!supportsGzip && !supportsDeflate) {
    return next();
  }

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  const chunks = [];
  let ended = false;

  res.write = function (chunk, encoding, callback) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    if (typeof encoding === "function") callback = encoding;
    if (callback) callback();
    return true;
  };

  res.end = function (chunk, encoding, callback) {
    if (ended) return;
    ended = true;

    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    if (typeof encoding === "function") callback = encoding;

    const body = Buffer.concat(chunks);
    const contentType = (res.getHeader("content-type") || "").split(";")[0].trim();

    // Skip compression for small responses, already-compressed types, or if encoding is already set
    if (
      body.length < MIN_SIZE ||
      SKIP_CONTENT_TYPES.has(contentType) ||
      res.getHeader("content-encoding")
    ) {
      res.setHeader("Content-Length", body.length);
      originalWrite(body);
      return originalEnd(null, null, callback);
    }

    const encoding_ = supportsGzip ? "gzip" : "deflate";
    const compressFn = supportsGzip ? zlib.gzipSync : zlib.deflateSync;

    try {
      const compressed = compressFn(body);
      res.setHeader("Content-Encoding", encoding_);
      res.setHeader("Content-Length", compressed.length);
      res.removeHeader("ETag"); // ETag may no longer match after compression
      res.setHeader("Vary", "Accept-Encoding");
      originalWrite(compressed);
    } catch (_) {
      // Compression failed — send uncompressed
      res.setHeader("Content-Length", body.length);
      originalWrite(body);
    }

    return originalEnd(null, null, callback);
  };

  next();
}

module.exports = compressionMiddleware;

const crypto = require("crypto");
const { logger } = require("./logger");

function requestTracing(req, res, next) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  req.requestId = requestId;
  res.set("X-Request-ID", requestId);

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.info("request_trace", {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers["user-agent"] || "unknown",
      ip: req.ip,
      userId: req.userId || null,
    });
  });

  next();
}

module.exports = requestTracing;

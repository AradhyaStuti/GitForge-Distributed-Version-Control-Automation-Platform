const config = require("../config/env");

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[config.nodeEnv === "production" ? "info" : "debug"];

function formatLog(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
    ...(config.nodeEnv !== "production" ? {} : { pid: process.pid }),
  });
}

const logger = {
  error(message, meta) {
    if (currentLevel >= LOG_LEVELS.error) console.error(formatLog("error", message, meta));
  },
  warn(message, meta) {
    if (currentLevel >= LOG_LEVELS.warn) console.warn(formatLog("warn", message, meta));
  },
  info(message, meta) {
    if (currentLevel >= LOG_LEVELS.info) console.log(formatLog("info", message, meta));
  },
  debug(message, meta) {
    if (currentLevel >= LOG_LEVELS.debug) console.log(formatLog("debug", message, meta));
  },
};

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    logger.info("request", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      ip: req.ip,
    });
  });
  next();
}

module.exports = { logger, requestLogger };

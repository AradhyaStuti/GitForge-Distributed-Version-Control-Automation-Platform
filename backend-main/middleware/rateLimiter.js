const rateLimit = require("express-rate-limit");
const config = require("../config/env");

const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many login attempts, please try again later." },
});

module.exports = { globalLimiter, authLimiter };

const dotenv = require("dotenv");
dotenv.config();

const requiredVars = ["MONGODB_URI", "JWT_SECRET_KEY"];

for (const key of requiredVars) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
if (bcryptRounds < 10) {
  console.error("FATAL: BCRYPT_ROUNDS must be at least 10 for security.");
  process.exit(1);
}

if (process.env.JWT_SECRET_KEY.length < 32) {
  console.warn("WARNING: JWT_SECRET_KEY should be at least 32 characters for security.");
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET_KEY,
  jwtExpiry: process.env.JWT_EXPIRY || "24h",
  bcryptRounds,
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  authRateLimit: {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 15,
  },
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION, 10) || 15 * 60 * 1000,
};

module.exports = config;

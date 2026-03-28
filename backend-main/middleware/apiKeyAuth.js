const jwt = require("jsonwebtoken");
const config = require("../config/env");
const APIKey = require("../models/APIKey");
const User = require("../models/userModel");

/**
 * Validate an API key and attach user/key info to the request.
 * Checks X-API-Key header or ?api_key query param.
 */
async function apiKeyAuth(req, res, next) {
  const rawKey = req.headers["x-api-key"] || req.query.api_key;

  if (!rawKey) {
    return res
      .status(401)
      .json({ status: "error", message: "Access denied. No API key or token provided." });
  }

  try {
    const hashedKey = APIKey.hashKey(rawKey);
    const apiKey = await APIKey.findOne({ key: hashedKey });

    if (!apiKey) {
      return res.status(401).json({ status: "error", message: "Invalid API key." });
    }

    if (!apiKey.isActive) {
      return res.status(401).json({ status: "error", message: "API key has been revoked." });
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return res.status(401).json({ status: "error", message: "API key has expired." });
    }

    const user = await User.findById(apiKey.owner).select("-password");
    if (!user) {
      return res.status(401).json({ status: "error", message: "API key owner not found." });
    }

    // Update usage stats (non-blocking)
    APIKey.updateOne(
      { _id: apiKey._id },
      { $set: { lastUsedAt: new Date(), lastUsedIP: req.ip }, $inc: { usageCount: 1 } }
    ).catch(() => {});

    req.user = user;
    req.userId = user._id.toString();
    req.apiKey = {
      id: apiKey._id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      prefix: apiKey.prefix,
    };

    next();
  } catch (err) {
    return res.status(500).json({ status: "error", message: "API key validation failed." });
  }
}

/**
 * Combined middleware: tries JWT Bearer token first, then falls back to API key.
 * If neither is present, returns 401.
 */
async function authenticateAny(req, res, next) {
  const authHeader = req.headers.authorization;

  // Try JWT first
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.userId = decoded.id;
      return next();
    } catch (err) {
      // JWT failed — fall through to API key
    }
  }

  // Try API key
  const rawKey = req.headers["x-api-key"] || req.query.api_key;
  if (rawKey) {
    return apiKeyAuth(req, res, next);
  }

  return res
    .status(401)
    .json({ status: "error", message: "Access denied. No valid token or API key provided." });
}

module.exports = { apiKeyAuth, authenticateAny };

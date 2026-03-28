/**
 * Enhanced security middleware bundle.
 * Provides NoSQL injection prevention, basic XSS protection,
 * and content-type validation without external dependencies.
 */

/**
 * Recursively strip keys starting with $ or containing . from an object
 * to prevent NoSQL injection attacks.
 */
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const cleaned = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    cleaned[key] = sanitizeObject(obj[key]);
  }
  return cleaned;
}

/**
 * Middleware: strips $ and . from req.body, req.query, req.params
 * to prevent NoSQL injection.
 */
function mongoSanitize(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * Encode HTML entities in a string.
 */
function encodeHtmlEntities(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Recursively apply HTML entity encoding to all string values in an object.
 */
function sanitizeStrings(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return encodeHtmlEntities(obj);

  if (Array.isArray(obj)) {
    return obj.map(sanitizeStrings);
  }

  if (typeof obj === "object") {
    const cleaned = {};
    for (const key of Object.keys(obj)) {
      cleaned[key] = sanitizeStrings(obj[key]);
    }
    return cleaned;
  }

  return obj;
}

/**
 * Middleware: basic XSS protection by HTML-encoding string values in req.body.
 */
function xssClean(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeStrings(req.body);
  }
  next();
}

const METHODS_REQUIRING_BODY = new Set(["POST", "PUT", "PATCH"]);

/**
 * Middleware: rejects POST/PUT/PATCH requests that lack a JSON content-type header.
 */
function contentTypeValidation(req, res, next) {
  if (METHODS_REQUIRING_BODY.has(req.method)) {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("application/json") && !contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded")) {
      return res.status(415).json({
        status: "error",
        message: "Unsupported Media Type. Expected application/json, multipart/form-data, or application/x-www-form-urlencoded.",
      });
    }
  }
  next();
}

/**
 * Combined security middleware array — apply with app.use(...securityMiddleware).
 */
const securityMiddleware = [mongoSanitize, xssClean, contentTypeValidation];

module.exports = { mongoSanitize, xssClean, contentTypeValidation, securityMiddleware };

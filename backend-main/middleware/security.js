// security primitives -- intentionally tiny so we don't pull a sanitizer
// library for two helpers. covers the cases we actually saw in tests.

// drop $-prefixed and dotted keys so mongo operator injection (e.g. {$ne:null})
// can't ride in through req.body / req.query / req.params.
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const cleaned = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    cleaned[key] = sanitizeObject(obj[key]);
  }
  return cleaned;
}

function mongoSanitize(req, _res, next) {
  if (req.body && typeof req.body === "object") req.body = sanitizeObject(req.body);
  if (req.query && typeof req.query === "object") req.query = sanitizeObject(req.query);
  if (req.params && typeof req.params === "object") req.params = sanitizeObject(req.params);
  next();
}

// HTML-entity-encode string values. catches the obvious reflected-XSS path
// where user input bounces back into a rendered template untouched.
function encodeHtmlEntities(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function sanitizeStrings(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return encodeHtmlEntities(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeStrings);

  if (typeof obj === "object") {
    const cleaned = {};
    for (const key of Object.keys(obj)) cleaned[key] = sanitizeStrings(obj[key]);
    return cleaned;
  }
  return obj;
}

function xssClean(req, _res, next) {
  if (req.body && typeof req.body === "object") req.body = sanitizeStrings(req.body);
  next();
}

const METHODS_REQUIRING_BODY = new Set(["POST", "PUT", "PATCH"]);

// reject body-carrying requests that didn't bother declaring a content-type.
// stops a class of "I sent JSON in a urlencoded body" bug reports.
function contentTypeValidation(req, res, next) {
  if (METHODS_REQUIRING_BODY.has(req.method)) {
    const contentType = req.headers["content-type"] || "";
    if (
      !contentType.includes("application/json") &&
      !contentType.includes("multipart/form-data") &&
      !contentType.includes("application/x-www-form-urlencoded")
    ) {
      return res.status(415).json({
        status: "error",
        message: "Unsupported Media Type. Expected application/json, multipart/form-data, or application/x-www-form-urlencoded.",
      });
    }
  }
  next();
}

const securityMiddleware = [mongoSanitize, xssClean, contentTypeValidation];

module.exports = { mongoSanitize, xssClean, contentTypeValidation, securityMiddleware };

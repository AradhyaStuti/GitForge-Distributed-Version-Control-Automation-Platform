const AuditLog = require("../models/AuditLog");

/**
 * Audit logging middleware factory.
 *
 * @param {string} action - The audit action string (e.g. "repo.create", "pr.merge")
 * @param {Function} [getResource] - Optional function (req) => ({ type, id, name })
 * @returns {Function} Express middleware
 */
function auditAction(action, getResource) {
  return (req, res, next) => {
    res.on("finish", () => {
      // Only log successful responses (2xx)
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const logEntry = {
        actor: req.userId || null,
        actorIP: req.ip,
        action,
        userAgent: req.headers["user-agent"] || "unknown",
        requestId: req.requestId || null,
        status: "success",
      };

      if (typeof getResource === "function") {
        try {
          logEntry.resource = getResource(req);
        } catch (_) {
          // Ignore resource extraction errors
        }
      }

      // Non-blocking write — fire and forget
      AuditLog.create(logEntry).catch(() => {});
    });

    next();
  };
}

module.exports = { auditAction };

const express = require("express");
const auditLogController = require("../controllers/auditLogController");
const authMiddleware = require("../middleware/authMiddleware");

const auditRouter = express.Router();

// Static routes before parameterized routes
auditRouter.get("/audit/me", authMiddleware, auditLogController.getMyAuditLogs);
auditRouter.get("/audit/security", authMiddleware, auditLogController.getSecurityEvents);
auditRouter.get("/audit/stats", authMiddleware, auditLogController.getAuditStats);

// Parameterized routes
auditRouter.get("/audit/resource/:type/:id", authMiddleware, auditLogController.getAuditLogsByResource);

module.exports = auditRouter;

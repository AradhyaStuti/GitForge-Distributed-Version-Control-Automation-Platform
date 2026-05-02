const auditLogService = require("../services/auditLogService");
const { asyncHandler } = require("../middleware/errorHandler");

const getMyAuditLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await auditLogService.listByUser(req.userId, { page, limit });
  res.json(result);
});

const getAuditLogsByResource = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await auditLogService.listByResource(type, id, { page, limit });
  res.json(result);
});

const getSecurityEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const result = await auditLogService.getSecurityEvents({ page, limit });
  res.json(result);
});

const getAuditStats = asyncHandler(async (req, res) => {
  const stats = await auditLogService.getStats();
  res.json(stats);
});

module.exports = {
  getMyAuditLogs,
  getAuditLogsByResource,
  getSecurityEvents,
  getAuditStats,
};

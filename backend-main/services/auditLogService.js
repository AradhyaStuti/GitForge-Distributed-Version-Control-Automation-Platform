'use strict';

const AuditLog = require("../models/AuditLog");
const { AppError } = require("../middleware/errorHandler");

class AuditLogService {
  async log({ actor, actorIP, action, resource, details, status, userAgent, requestId }) {
    if (!action) throw new AppError("Audit action is required.", 400);

    return AuditLog.create({
      actor,
      actorIP,
      action,
      resource,
      details,
      status: status || "success",
      userAgent,
      requestId,
    });
  }

  // ── Controller-facing methods (match auditLogController.js signatures) ──

  async listByUser(userId, { page = 1, limit = 50, action, startDate, endDate } = {}) {
    const skip = (page - 1) * limit;
    const filter = { actor: userId };

    if (action) filter.action = action;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async listByResource(resourceType, resourceId, { page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;
    const filter = { "resource.type": resourceType, "resource.id": resourceId };

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getSecurityEvents({ page = 1, limit = 50, startDate, endDate } = {}) {
    const securityActions = [
      "user.login",
      "user.logout",
      "user.delete",
      "apikey.create",
      "apikey.revoke",
      "permission.change",
      "admin.action",
      "settings.change",
    ];

    const skip = (page - 1) * limit;
    const filter = { action: { $in: securityActions } };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getStats({ startDate, endDate } = {}) {
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [actionCounts, statusCounts, dailyActivity, topActors] = await Promise.all([
      AuditLog.aggregate([
        { $match: match },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]),
      AuditLog.aggregate([
        { $match: match },
        { $group: { _id: "$actor", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      actionCounts: actionCounts.map((a) => ({ action: a._id, count: a.count })),
      statusCounts: statusCounts.map((s) => ({ status: s._id, count: s.count })),
      dailyActivity: dailyActivity.map((d) => ({ date: d._id, count: d.count })),
      topActors,
    };
  }
}

module.exports = new AuditLogService();

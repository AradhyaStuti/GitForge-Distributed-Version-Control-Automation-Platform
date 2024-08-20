const notificationService = require("../services/notificationService");
const { asyncHandler } = require("../middleware/errorHandler");

const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const unreadOnly = req.query.unread === "true";
  const result = await notificationService.listForUser(req.userId, { page, limit, unreadOnly });
  res.json(result);
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.userId);
  res.json(notification);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.userId);
  res.json(result);
});

module.exports = { getNotifications, markAsRead, markAllAsRead };

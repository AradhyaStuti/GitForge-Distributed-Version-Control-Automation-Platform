const Notification = require("../models/notificationModel");
const { AppError } = require("../middleware/errorHandler");

class NotificationService {
  async create({ recipient, type, message, link, actor }) {
    return Notification.create({ recipient, type, message, link, actor });
  }

  async listForUser(userId, { page = 1, limit = 20, unreadOnly = false }) {
    const skip = (page - 1) * limit;
    const filter = { recipient: userId };
    if (unreadOnly) filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate("actor", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, read: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(id, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { read: true },
      { new: true }
    );
    if (!notification) throw new AppError("Notification not found.", 404);
    return notification;
  }

  async markAllAsRead(userId) {
    await Notification.updateMany({ recipient: userId, read: false }, { read: true });
    return { message: "All notifications marked as read." };
  }
}

module.exports = new NotificationService();

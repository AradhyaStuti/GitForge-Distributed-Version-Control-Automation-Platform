const crypto = require("crypto");
const Webhook = require("../models/webhookModel");
const { AppError } = require("../middleware/errorHandler");

class WebhookService {
  async create({ url, secret, events, repository, owner }) {
    return Webhook.create({ url, secret, events, repository, owner });
  }

  async list(repositoryId, ownerId) {
    return Webhook.find({ repository: repositoryId, owner: ownerId })
      .select("-deliveries")
      .sort({ createdAt: -1 });
  }

  async getById(id, ownerId) {
    const wh = await Webhook.findOne({ _id: id, owner: ownerId });
    if (!wh) throw new AppError("Webhook not found.", 404);
    return wh;
  }

  async update(id, ownerId, updates) {
    const wh = await Webhook.findOne({ _id: id, owner: ownerId });
    if (!wh) throw new AppError("Webhook not found.", 404);
    const allowed = ["url", "secret", "events", "active"];
    for (const k of Object.keys(updates)) { if (allowed.includes(k)) wh[k] = updates[k]; }
    await wh.save();
    return wh;
  }

  async delete(id, ownerId) {
    const wh = await Webhook.findOneAndDelete({ _id: id, owner: ownerId });
    if (!wh) throw new AppError("Webhook not found.", 404);
    return { message: "Webhook deleted." };
  }

  async deliver(repositoryId, event, payload) {
    const webhooks = await Webhook.find({ repository: repositoryId, active: true, events: event });
    const results = [];

    for (const wh of webhooks) {
      const delivery = { event, payload, status: "pending" };
      try {
        const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
        const headers = { "Content-Type": "application/json", "X-GitlessForge-Event": event };

        if (wh.secret) {
          const sig = crypto.createHmac("sha256", wh.secret).update(body).digest("hex");
          headers["X-GitlessForge-Signature"] = `sha256=${sig}`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(wh.url, { method: "POST", headers, body, signal: controller.signal });
        clearTimeout(timeout);

        delivery.statusCode = res.status;
        delivery.response = (await res.text()).slice(0, 1000);
        delivery.status = res.ok ? "delivered" : "failed";
        delivery.deliveredAt = new Date();
      } catch (err) {
        delivery.status = "failed";
        delivery.response = err.message?.slice(0, 1000);
        delivery.deliveredAt = new Date();
      }

      wh.deliveries.push(delivery);
      if (wh.deliveries.length > 50) wh.deliveries = wh.deliveries.slice(-50);
      await wh.save();
      results.push({ webhookId: wh._id, status: delivery.status });
    }
    return results;
  }
}

module.exports = new WebhookService();

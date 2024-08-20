const mongoose = require("mongoose");
const { Schema } = mongoose;

const WebhookEventSchema = new Schema({
  event: { type: String, required: true },
  payload: { type: Schema.Types.Mixed },
  status: { type: String, enum: ["pending", "delivered", "failed"], default: "pending" },
  statusCode: { type: Number },
  response: { type: String, maxlength: 5000 },
  deliveredAt: { type: Date },
}, { timestamps: true });

const WebhookSchema = new Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    secret: { type: String, trim: true, maxlength: 256 },
    events: [{ type: String, enum: [
      "repo.created", "repo.updated", "repo.deleted",
      "issue.created", "issue.closed", "issue.reopened",
      "pr.created", "pr.merged", "pr.closed",
      "push", "star", "fork", "comment.created",
    ]}],
    repository: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    active: { type: Boolean, default: true },
    deliveries: [WebhookEventSchema],
  },
  { timestamps: true }
);

WebhookSchema.index({ repository: 1, owner: 1 });

const Webhook = mongoose.model("Webhook", WebhookSchema);
module.exports = Webhook;

const mongoose = require("mongoose");
const { Schema } = mongoose;

const AuditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorIP: { type: String },
    action: {
      type: String,
      required: true,
      enum: [
        "user.login",
        "user.logout",
        "user.signup",
        "user.delete",
        "repo.create",
        "repo.delete",
        "repo.visibility_change",
        "pr.merge",
        "pr.create",
        "webhook.create",
        "webhook.delete",
        "apikey.create",
        "apikey.revoke",
        "pipeline.run",
        "pipeline.delete",
        "admin.action",
        "settings.change",
        "permission.change",
      ],
    },
    resource: {
      type: { type: String },
      id: { type: Schema.Types.ObjectId },
      name: { type: String },
    },
    details: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
    },
    userAgent: { type: String },
    requestId: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
AuditLogSchema.index({ "resource.type": 1, "resource.id": 1 });

const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
module.exports = AuditLog;

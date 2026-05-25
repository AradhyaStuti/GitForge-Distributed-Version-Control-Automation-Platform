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
        "user.update",
        "user.delete",
        "repo.create",
        "repo.delete",
        "repo.visibility_change",
        "pr.create",
        "pr.merge",
        "apikey.create",
        "apikey.revoke",
        "apikey.rotate",
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

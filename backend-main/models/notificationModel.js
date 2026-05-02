const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["issue_created", "repo_starred", "user_followed", "issue_closed", "repo_forked"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    link: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
// TTL: drop after 90 days. mongo runs the cleanup once a minute so don't
// expect it to be exact. fine for our use case (clearing old notifs).
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;

const mongoose = require("mongoose");
const { Schema } = mongoose;
const crypto = require("crypto");

const APIKeySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true },
    prefix: { type: String, required: true },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scopes: [
      {
        type: String,
        enum: [
          "repo:read",
          "repo:write",
          "issue:read",
          "issue:write",
          "pr:read",
          "pr:write",
          "user:read",
          "webhook:manage",
          "admin",
          "pipeline:read",
          "pipeline:write",
        ],
      },
    ],
    lastUsedAt: { type: Date },
    lastUsedIP: { type: String },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    rateLimit: {
      maxRequests: { type: Number, default: 5000 },
      windowMs: { type: Number, default: 3600000 },
    },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

APIKeySchema.index({ owner: 1, createdAt: -1 });

APIKeySchema.index({ expiresAt: 1 });

APIKeySchema.statics.generateKey = function () {
  const raw = crypto.randomBytes(32).toString("hex");
  return `gf_${raw}`;
};

APIKeySchema.statics.hashKey = function (plainKey) {
  return crypto.createHash("sha256").update(plainKey).digest("hex");
};

const APIKey = mongoose.model("APIKey", APIKeySchema);
module.exports = APIKey;

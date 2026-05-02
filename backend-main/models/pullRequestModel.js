const mongoose = require("mongoose");
const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["approved", "changes_requested", "commented"],
      required: true,
    },
    body: { type: String, maxlength: 10000 },
  },
  { timestamps: true }
);

const PullRequestSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 256 },
    description: { type: String, trim: true, maxlength: 65536, default: "" },
    status: {
      type: String,
      enum: ["open", "closed", "merged"],
      default: "open",
    },
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sourceBranch: { type: String, required: true, trim: true },
    targetBranch: { type: String, required: true, trim: true, default: "main" },
    labels: [{ type: String, trim: true }],
    reviewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reviews: [ReviewSchema],
    mergedBy: { type: Schema.Types.ObjectId, ref: "User" },
    mergedAt: { type: Date },
    changedFiles: { type: Number, default: 0 },
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PullRequestSchema.index({ repository: 1, status: 1, createdAt: -1 });
PullRequestSchema.index({ author: 1, createdAt: -1 });
PullRequestSchema.index({ title: "text", description: "text" });

const PullRequest = mongoose.model("PullRequest", PullRequestSchema);
module.exports = PullRequest;

const mongoose = require("mongoose");
const { Schema } = mongoose;

const SuggestionSchema = new Schema(
  {
    file: { type: String },
    line: { type: Number },
    endLine: { type: Number },
    severity: {
      type: String,
      enum: ["critical", "warning", "info", "style"],
    },
    category: {
      type: String,
      enum: ["security", "performance", "maintainability", "bug", "style", "complexity", "best-practice"],
    },
    title: { type: String },
    description: { type: String },
    suggestedFix: { type: String },
    accepted: { type: Boolean, default: null },
    language: { type: String },
  },
  { _id: false }
);

const CodeReviewSchema = new Schema(
  {
    pullRequest: {
      type: Schema.Types.ObjectId,
      ref: "PullRequest",
      required: true,
    },
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    reviewer: {
      type: String,
      enum: ["ai", "human"],
      default: "ai",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "failed"],
      default: "pending",
    },
    engine: { type: String, default: "gitforge-ai-v1" },
    summary: { type: String },
    score: { type: Number, min: 0, max: 100 },
    suggestions: [SuggestionSchema],
    metrics: {
      linesAnalyzed: { type: Number },
      filesAnalyzed: { type: Number },
      issuesFound: { type: Number },
      criticalIssues: { type: Number },
      estimatedDebt: { type: Number },
      complexityScore: { type: Number },
      duplicateBlocks: { type: Number },
      testCoverage: { type: Number },
    },
    diff: { type: String },
    analysisTime: { type: Number },
  },
  { timestamps: true }
);

CodeReviewSchema.index({ pullRequest: 1, createdAt: -1 });
CodeReviewSchema.index({ repository: 1 });
CodeReviewSchema.index({ status: 1 });

const CodeReview = mongoose.model("CodeReview", CodeReviewSchema);
module.exports = CodeReview;

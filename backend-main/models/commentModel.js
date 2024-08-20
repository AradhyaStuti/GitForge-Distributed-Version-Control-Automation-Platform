const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommentSchema = new Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 10000 },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Polymorphic: can belong to an issue or a pull request
    issue: { type: Schema.Types.ObjectId, ref: "Issue" },
    pullRequest: { type: Schema.Types.ObjectId, ref: "PullRequest" },
    // For inline code comments on PRs
    filePath: { type: String },
    lineNumber: { type: Number },
    // Reactions
    reactions: {
      thumbsUp: [{ type: Schema.Types.ObjectId, ref: "User" }],
      thumbsDown: [{ type: Schema.Types.ObjectId, ref: "User" }],
      heart: [{ type: Schema.Types.ObjectId, ref: "User" }],
      hooray: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CommentSchema.index({ issue: 1, createdAt: 1 });
CommentSchema.index({ pullRequest: 1, createdAt: 1 });
CommentSchema.index({ author: 1 });

const Comment = mongoose.model("Comment", CommentSchema);
module.exports = Comment;

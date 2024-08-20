const mongoose = require("mongoose");
const { Schema } = mongoose;

const IssueSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },
    description: {
      type: String,
      required: true,
      maxlength: 65536,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes for common queries
IssueSchema.index({ repository: 1, status: 1, createdAt: -1 });
IssueSchema.index({ author: 1 });
IssueSchema.index({ title: "text", description: "text" });

const Issue = mongoose.model("Issue", IssueSchema);

module.exports = Issue;

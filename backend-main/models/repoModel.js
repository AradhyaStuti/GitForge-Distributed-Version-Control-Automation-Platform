const mongoose = require("mongoose");
const { Schema } = mongoose;

const RepositorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    content: [
      {
        type: String,
      },
    ],
    visibility: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issues: [
      {
        type: Schema.Types.ObjectId,
        ref: "Issue",
      },
    ],
    forkedFrom: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for common queries
RepositorySchema.index({ owner: 1, name: 1 }, { unique: true });
RepositorySchema.index({ owner: 1, updatedAt: -1 });
RepositorySchema.index({ visibility: 1, createdAt: -1 });
RepositorySchema.index({ name: "text", description: "text" });

const Repository = mongoose.model("Repository", RepositorySchema);

module.exports = Repository;

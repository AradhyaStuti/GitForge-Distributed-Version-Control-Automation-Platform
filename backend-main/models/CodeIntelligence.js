const mongoose = require("mongoose");
const { Schema } = mongoose;

const LanguageSchema = new Schema(
  {
    name: { type: String, required: true },
    bytes: { type: Number },
    percentage: { type: Number },
    color: { type: String },
  },
  { _id: false }
);

const DependencySchema = new Schema(
  {
    name: { type: String, required: true },
    version: { type: String },
    type: {
      type: String,
      enum: ["production", "dev"],
      default: "production",
    },
  },
  { _id: false }
);

const CodeIntelligenceSchema = new Schema(
  {
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    branch: { type: String, default: "main" },
    languages: [LanguageSchema],
    totalSize: { type: Number },
    totalFiles: { type: Number },
    directoryStructure: { type: Schema.Types.Mixed },
    dependencies: [DependencySchema],
    analyzedAt: { type: Date },
  },
  { timestamps: true }
);

CodeIntelligenceSchema.index({ repository: 1, branch: 1 });

const CodeIntelligence = mongoose.model("CodeIntelligence", CodeIntelligenceSchema);
module.exports = CodeIntelligence;

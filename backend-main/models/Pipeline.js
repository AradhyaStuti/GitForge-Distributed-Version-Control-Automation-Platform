const mongoose = require("mongoose");
const { Schema } = mongoose;

const StepSchema = new Schema(
  {
    name: { type: String, required: true },
    command: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "running", "success", "failed", "skipped"],
      default: "pending",
    },
    output: { type: String },
    exitCode: { type: Number },
    duration: { type: Number },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { _id: false }
);

const RunStageSchema = new Schema(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "running", "success", "failed", "skipped"],
      default: "pending",
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    steps: [StepSchema],
  },
  { _id: false }
);

const RunSchema = new Schema(
  {
    runNumber: { type: Number, required: true },
    trigger: { type: String },
    triggerBy: { type: Schema.Types.ObjectId, ref: "User" },
    branch: { type: String },
    commitSha: { type: String },
    status: {
      type: String,
      enum: ["queued", "running", "success", "failed", "cancelled"],
      default: "queued",
    },
    stages: [RunStageSchema],
    startedAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number },
    logs: { type: String },
  },
  { _id: false }
);

const ConfigStepSchema = new Schema(
  {
    name: { type: String, required: true },
    command: { type: String, required: true },
    image: { type: String },
    timeout: { type: Number },
    env: { type: Schema.Types.Mixed },
    continueOnError: { type: Boolean, default: false },
  },
  { _id: false }
);

const ConfigStageSchema = new Schema(
  {
    name: { type: String, required: true },
    steps: [ConfigStepSchema],
  },
  { _id: false }
);

const PipelineSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    config: {
      triggers: [{ type: String, enum: ["push", "pull_request", "manual", "schedule"] }],
      stages: [ConfigStageSchema],
    },
    status: {
      type: String,
      enum: ["idle", "running", "success", "failed", "cancelled"],
      default: "idle",
    },
    runs: [RunSchema],
    lastRunAt: { type: Date },
    totalRuns: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    averageDuration: { type: Number, default: 0 },
    badges: {
      status: { type: String },
      coverage: { type: Number },
    },
  },
  { timestamps: true }
);

PipelineSchema.index({ repository: 1, name: 1 }, { unique: true });
PipelineSchema.index({ owner: 1 });
PipelineSchema.index({ status: 1 });
PipelineSchema.index({ "runs.status": 1 });

const Pipeline = mongoose.model("Pipeline", PipelineSchema);
module.exports = Pipeline;

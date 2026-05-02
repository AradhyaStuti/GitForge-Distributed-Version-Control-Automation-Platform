const mongoose = require("mongoose");
const { Schema } = mongoose;
const crypto = require("crypto");

const CardSchema = new Schema(
  {
    id: { type: String, default: () => crypto.randomUUID() },
    type: {
      type: String,
      enum: ["issue", "task", "note"],
      default: "task",
    },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    issue: { type: Schema.Types.ObjectId, ref: "Issue" },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    labels: [{ type: String }],
    priority: {
      type: String,
      enum: ["critical", "high", "medium", "low", "none"],
      default: "none",
    },
    dueDate: { type: Date },
    position: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ColumnSchema = new Schema(
  {
    id: { type: String, default: () => crypto.randomUUID() },
    name: { type: String, required: true, trim: true },
    position: { type: Number },
    color: { type: String, default: "#7c3aed" },
    wipLimit: { type: Number, default: 0 },
    cards: [CardSchema],
  },
  { _id: false }
);

const MemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["admin", "editor", "viewer"],
      default: "viewer",
    },
  },
  { _id: false }
);

const ProjectBoardSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    columns: [ColumnSchema],
    members: [MemberSchema],
    settings: {
      defaultColumn: { type: String },
      autoArchiveDays: { type: Number, default: 30 },
      showLabels: { type: Boolean, default: true },
      showAssignees: { type: Boolean, default: true },
      showPriority: { type: Boolean, default: true },
    },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProjectBoardSchema.index({ owner: 1, createdAt: -1 });
ProjectBoardSchema.index({ repository: 1 });
ProjectBoardSchema.index({ "members.user": 1 });

const DEFAULT_COLUMNS = ["Backlog", "To Do", "In Progress", "In Review", "Done"];

ProjectBoardSchema.pre("save", function (next) {
  if (this.isNew && (!this.columns || this.columns.length === 0)) {
    this.columns = DEFAULT_COLUMNS.map((name, index) => ({
      id: crypto.randomUUID(),
      name,
      position: index,
      color: "#7c3aed",
      wipLimit: 0,
      cards: [],
    }));
  }
  next();
});

const ProjectBoard = mongoose.model("ProjectBoard", ProjectBoardSchema);
module.exports = ProjectBoard;

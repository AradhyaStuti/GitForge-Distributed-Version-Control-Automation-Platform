const mongoose = require("mongoose");
const { Schema } = mongoose;

const MilestoneSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 256 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    dueDate: { type: Date },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    repository: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

MilestoneSchema.index({ repository: 1, status: 1 });

const Milestone = mongoose.model("Milestone", MilestoneSchema);
module.exports = Milestone;

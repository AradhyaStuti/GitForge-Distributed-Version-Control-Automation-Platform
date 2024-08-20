const mongoose = require("mongoose");
const { Schema } = mongoose;

const LabelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    color: {
      type: String,
      required: true,
      match: /^#[0-9A-Fa-f]{6}$/,
      default: "#e4e669",
    },
    description: { type: String, trim: true, maxlength: 200, default: "" },
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
  },
  { timestamps: true }
);

LabelSchema.index({ repository: 1, name: 1 }, { unique: true });

const Label = mongoose.model("Label", LabelSchema);
module.exports = Label;

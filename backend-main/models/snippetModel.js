const mongoose = require("mongoose");
const { Schema } = mongoose;

const SnippetFileSchema = new Schema({
  filename: { type: String, required: true, trim: true, maxlength: 255 },
  language: { type: String, trim: true, default: "plaintext" },
  content: { type: String, required: true, maxlength: 500000 },
});

const SnippetSchema = new Schema(
  {
    title: { type: String, trim: true, maxlength: 256, default: "Untitled snippet" },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    files: [SnippetFileSchema],
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    visibility: { type: Boolean, default: true },
    stars: [{ type: Schema.Types.ObjectId, ref: "User" }],
    forkOf: { type: Schema.Types.ObjectId, ref: "Snippet" },
    forkCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SnippetSchema.index({ author: 1, createdAt: -1 });
SnippetSchema.index({ visibility: 1, createdAt: -1 });
SnippetSchema.index({ title: "text", description: "text" });

const Snippet = mongoose.model("Snippet", SnippetSchema);
module.exports = Snippet;

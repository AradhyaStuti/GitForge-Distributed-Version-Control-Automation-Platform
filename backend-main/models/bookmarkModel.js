const mongoose = require("mongoose");
const { Schema } = mongoose;

const BookmarkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    repository: { type: Schema.Types.ObjectId, ref: "Repository" },
    snippet: { type: Schema.Types.ObjectId, ref: "Snippet" },
    note: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

BookmarkSchema.index({ user: 1, repository: 1 }, { unique: true, sparse: true });
BookmarkSchema.index({ user: 1, snippet: 1 }, { unique: true, sparse: true });

const Bookmark = mongoose.model("Bookmark", BookmarkSchema);
module.exports = Bookmark;

const mongoose = require("mongoose");

const commitFileSchema = new mongoose.Schema({
  repoName: { type: String, required: true },
  commitId: { type: String, required: true },
  filename: { type: String, required: true },
  content: { type: Buffer, required: true },
});

module.exports = mongoose.model("CommitFile", commitFileSchema);

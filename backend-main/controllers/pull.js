const fs = require("fs").promises;
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const CommitFile = require("../models/commitFileModel");

async function pullRepo() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitsPath = path.join(repoPath, "commits");

  try {
    const config = JSON.parse(
      await fs.readFile(path.join(repoPath, "config.json"), "utf-8")
    );
    const repoName = config.repoName;

    await mongoose.connect(process.env.MONGODB_URI);

    const files = await CommitFile.find({ repoName });

    for (const file of files) {
      const commitDir = path.join(commitsPath, file.commitId);
      await fs.mkdir(commitDir, { recursive: true });
      await fs.writeFile(path.join(commitDir, file.filename), file.content);
    }

    console.log("All commits pulled from MongoDB.");
  } catch (err) {
    console.error("Unable to pull:", err);
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = { pullRepo };

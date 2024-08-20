const fs = require("fs").promises;
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const CommitFile = require("../models/commitFileModel");

async function pushRepo() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitsPath = path.join(repoPath, "commits");

  try {
    const config = JSON.parse(
      await fs.readFile(path.join(repoPath, "config.json"), "utf-8")
    );
    const repoName = config.repoName;

    await mongoose.connect(process.env.MONGODB_URI);

    const commitDirs = await fs.readdir(commitsPath);

    for (const commitDir of commitDirs) {
      const commitPath = path.join(commitsPath, commitDir);
      const files = await fs.readdir(commitPath);

      for (const file of files) {
        const filePath = path.join(commitPath, file);
        const content = await fs.readFile(filePath);

        await CommitFile.findOneAndUpdate(
          { repoName, commitId: commitDir, filename: file },
          { repoName, commitId: commitDir, filename: file, content },
          { upsert: true }
        );
      }
    }

    console.log("All commits pushed to MongoDB.");
  } catch (err) {
    console.error("Error pushing to MongoDB:", err);
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = { pushRepo };

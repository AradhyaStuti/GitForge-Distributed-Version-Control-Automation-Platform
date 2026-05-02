const fs = require("fs").promises;
const path = require("path");

async function diffRepo(filename) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");

  try {
    if (!filename) {
      console.log("Usage: diff <file>");
      return;
    }

    const commitsPath = path.join(repoPath, "commits");
    const commitDirs = await fs.readdir(commitsPath);

    let lastCommittedContent = null;
    let latestDate = null;

    for (const commitId of commitDirs) {
      try {
        const meta = JSON.parse(await fs.readFile(path.join(commitsPath, commitId, "commit.json"), "utf-8"));
        const filePath = path.join(commitsPath, commitId, filename);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (exists && (!latestDate || new Date(meta.date) > new Date(latestDate))) {
          lastCommittedContent = await fs.readFile(filePath, "utf-8");
          latestDate = meta.date;
        }
      } catch (_) { /* ignored */ }
    }

    let stagedContent = null;
    try {
      stagedContent = await fs.readFile(path.join(repoPath, "staging", filename), "utf-8");
    } catch (_) { /* ignored */ }

    if (!stagedContent && !lastCommittedContent) {
      console.log(`File '${filename}' not found in staging or any commit.`);
      return;
    }

    const oldLines = (lastCommittedContent || "").split("\n");
    const newLines = (stagedContent || "").split("\n");

    console.log(`--- a/${filename} (last commit)`);
    console.log(`+++ b/${filename} (staged)`);

    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      const o = oldLines[i];
      const n = newLines[i];
      if (o === undefined)      console.log(`+ ${n}`);
      else if (n === undefined) console.log(`- ${o}`);
      else if (o !== n)        { console.log(`- ${o}`); console.log(`+ ${n}`); }
      else                      console.log(`  ${o}`);
    }
  } catch (err) {
    console.error("Error running diff:", err);
  }
}

async function showCommit(commitID) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitDir = path.join(repoPath, "commits", commitID);

  try {
    const meta = JSON.parse(await fs.readFile(path.join(commitDir, "commit.json"), "utf-8"));
    console.log(`commit  ${commitID}`);
    console.log(`Branch: ${meta.branch || "unknown"}`);
    console.log(`Parent: ${meta.parent || "(root commit)"}`);
    console.log(`Date:   ${meta.date}`);
    console.log(`\n    ${meta.message}\n`);

    const files = (await fs.readdir(commitDir)).filter(f => f !== "commit.json");
    console.log("Files:");
    for (const file of files) {
      const content = await fs.readFile(path.join(commitDir, file), "utf-8");
      console.log(`\n  --- ${file} ---`);
      console.log(content);
    }
  } catch (err) {
    console.error("Error showing commit:", err);
  }
}

module.exports = { diffRepo, showCommit };

const fs = require("fs").promises;
const path = require("path");

async function logRepo() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitsPath = path.join(repoPath, "commits");

  try {
    const commitDirs = await fs.readdir(commitsPath);
    const commits = [];

    for (const commitId of commitDirs) {
      try {
        const data = JSON.parse(await fs.readFile(path.join(commitsPath, commitId, "commit.json"), "utf-8"));
        commits.push({ commitId, ...data });
      } catch (_) { /* ignored */ }
    }

    commits.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (commits.length === 0) {
      console.log("No commits yet.");
      return;
    }

    for (const c of commits) {
      console.log(`commit ${c.commitId}`);
      console.log(`Branch: ${c.branch || "unknown"}`);
      console.log(`Date:   ${c.date}`);
      console.log(`\n    ${c.message}\n`);
    }
  } catch (err) {
    console.error("Error reading log:", err);
  }
}

async function shortlogRepo() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitsPath = path.join(repoPath, "commits");

  try {
    const commitDirs = await fs.readdir(commitsPath);
    const commits = [];

    for (const commitId of commitDirs) {
      try {
        const data = JSON.parse(await fs.readFile(path.join(commitsPath, commitId, "commit.json"), "utf-8"));
        commits.push({ short: commitId.slice(0, 7), message: data.message, date: data.date });
      } catch (_) { /* ignored */ }
    }

    commits.sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log(`Total commits: ${commits.length}\n`);
    commits.forEach(c => console.log(`  ${c.short}  ${c.message}`));
  } catch (err) {
    console.error("Error reading shortlog:", err);
  }
}

async function reflogRepo() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");

  try {
    const reflog = JSON.parse(await fs.readFile(path.join(repoPath, "reflog.json"), "utf-8"));

    if (reflog.length === 0) {
      console.log("No reflog entries.");
      return;
    }

    [...reflog].reverse().forEach((entry, i) => {
      const id = entry.commitId ? entry.commitId.slice(0, 7) : "-------";
      console.log(`HEAD@{${i}} ${id} ${entry.action}: ${entry.message || entry.action}`);
    });
  } catch (err) {
    console.error("Error reading reflog:", err);
  }
}

module.exports = { logRepo, shortlogRepo, reflogRepo };

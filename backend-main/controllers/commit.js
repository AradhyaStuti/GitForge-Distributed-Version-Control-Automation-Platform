const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");

async function commitRepo(message) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const stagedPath = path.join(repoPath, "staging");
  const commitsPath = path.join(repoPath, "commits");

  try {
    const files = await fs.readdir(stagedPath);
    if (files.length === 0) {
      console.log("Nothing to commit. Stage files first with: add <file>");
      return;
    }

    const currentBranch = (await fs.readFile(path.join(repoPath, "HEAD"), "utf-8")).trim();

    let parentCommitId = null;
    try {
      const b = JSON.parse(await fs.readFile(path.join(repoPath, "branches", `${currentBranch}.json`), "utf-8"));
      parentCommitId = b.commitId;
    } catch (_) { /* ignored */ }

    const commitID = uuidv4();
    const commitDir = path.join(commitsPath, commitID);
    await fs.mkdir(commitDir, { recursive: true });

    for (const file of files) {
      await fs.copyFile(path.join(stagedPath, file), path.join(commitDir, file));
    }

    await fs.writeFile(
      path.join(commitDir, "commit.json"),
      JSON.stringify({ message, date: new Date().toISOString(), branch: currentBranch, parent: parentCommitId }, null, 2)
    );

    // Update branch tip
    await fs.writeFile(
      path.join(repoPath, "branches", `${currentBranch}.json`),
      JSON.stringify({ name: currentBranch, commitId: commitID }, null, 2)
    );

    // Update reflog
    let reflog = [];
    try { reflog = JSON.parse(await fs.readFile(path.join(repoPath, "reflog.json"), "utf-8")); } catch (_) { /* ignored */ }
    reflog.push({ action: "commit", commitId: commitID, message, branch: currentBranch, date: new Date().toISOString() });
    await fs.writeFile(path.join(repoPath, "reflog.json"), JSON.stringify(reflog, null, 2));

    // Clear staging
    for (const file of files) {
      await fs.unlink(path.join(stagedPath, file));
    }

    console.log(`[${currentBranch} ${commitID.slice(0, 7)}] ${message}`);
  } catch (err) {
    console.error("Error committing files:", err);
  }
}

module.exports = { commitRepo };

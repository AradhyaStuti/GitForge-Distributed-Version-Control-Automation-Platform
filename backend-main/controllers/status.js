const fs = require("fs").promises;
const path = require("path");

async function statusRepo() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");

  try {
    const currentBranch = (await fs.readFile(path.join(repoPath, "HEAD"), "utf-8")).trim();
    console.log(`On branch ${currentBranch}`);

    let branchTip = null;
    try {
      const b = JSON.parse(await fs.readFile(path.join(repoPath, "branches", `${currentBranch}.json`), "utf-8"));
      branchTip = b.commitId;
    } catch (_) { /* ignored */ }

    if (branchTip) {
      console.log(`HEAD -> ${branchTip.slice(0, 7)}`);
    } else {
      console.log("No commits yet.");
    }

    const stagingPath = path.join(repoPath, "staging");
    let staged = [];
    try { staged = await fs.readdir(stagingPath); } catch (_) { /* ignored */ }

    if (staged.length > 0) {
      console.log("\nChanges staged for commit:");
      staged.forEach(f => console.log(`  staged:   ${f}`));
    } else {
      console.log("\nNothing staged. Working tree clean.");
    }
  } catch (err) {
    console.error("Not a Gitless Forge repository. Run: init");
  }
}

module.exports = { statusRepo };

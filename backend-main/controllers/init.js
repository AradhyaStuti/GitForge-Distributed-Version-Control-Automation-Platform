const fs = require("fs").promises;
const path = require("path");

async function initRepo() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");

  try {
    await fs.mkdir(path.join(repoPath, "commits"),  { recursive: true });
    await fs.mkdir(path.join(repoPath, "staging"),  { recursive: true });
    await fs.mkdir(path.join(repoPath, "branches"), { recursive: true });
    await fs.mkdir(path.join(repoPath, "tags"),     { recursive: true });
    await fs.mkdir(path.join(repoPath, "stash"),    { recursive: true });

    const repoName = path.basename(process.cwd());

    await fs.writeFile(
      path.join(repoPath, "config.json"),
      JSON.stringify({ repoName, user: "", email: "" }, null, 2)
    );

    await fs.writeFile(path.join(repoPath, "HEAD"), "main");

    await fs.writeFile(
      path.join(repoPath, "branches", "main.json"),
      JSON.stringify({ name: "main", commitId: null }, null, 2)
    );

    await fs.writeFile(path.join(repoPath, "remotes.json"), JSON.stringify({}, null, 2));
    await fs.writeFile(path.join(repoPath, "reflog.json"),  JSON.stringify([], null, 2));
    await fs.writeFile(
      path.join(repoPath, "stash", "stash.json"),
      JSON.stringify([], null, 2)
    );

    console.log(`Initialized empty GitForge repository: ${repoPath}`);
  } catch (err) {
    console.error("Error initialising repository:", err);
  }
}

module.exports = { initRepo };

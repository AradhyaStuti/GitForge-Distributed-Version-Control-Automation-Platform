const fs = require("fs").promises;
const path = require("path");

async function listBranches() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const current = (await fs.readFile(path.join(repoPath, "HEAD"), "utf-8")).trim();
    const files = await fs.readdir(path.join(repoPath, "branches"));
    files.forEach(f => {
      const name = f.replace(".json", "");
      console.log(name === current ? `* ${name}` : `  ${name}`);
    });
  } catch (err) { console.error("Error listing branches:", err); }
}

async function createBranch(name) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const current = (await fs.readFile(path.join(repoPath, "HEAD"), "utf-8")).trim();
    const currentData = JSON.parse(await fs.readFile(path.join(repoPath, "branches", `${current}.json`), "utf-8"));
    const branchFile = path.join(repoPath, "branches", `${name}.json`);
    const exists = await fs.access(branchFile).then(() => true).catch(() => false);
    if (exists) { console.log(`Branch '${name}' already exists.`); return; }
    await fs.writeFile(branchFile, JSON.stringify({ name, commitId: currentData.commitId }, null, 2));
    console.log(`Branch '${name}' created at ${(currentData.commitId || "").slice(0, 7) || "(no commits)"}.`);
  } catch (err) { console.error("Error creating branch:", err); }
}

async function deleteBranch(name) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const current = (await fs.readFile(path.join(repoPath, "HEAD"), "utf-8")).trim();
    if (current === name) { console.log(`Cannot delete checked-out branch '${name}'.`); return; }
    await fs.unlink(path.join(repoPath, "branches", `${name}.json`));
    console.log(`Deleted branch '${name}'.`);
  } catch (err) { console.error("Error deleting branch:", err); }
}

async function renameBranch(oldName, newName) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const branchFile = path.join(repoPath, "branches", `${oldName}.json`);
    const data = JSON.parse(await fs.readFile(branchFile, "utf-8"));
    data.name = newName;
    await fs.writeFile(path.join(repoPath, "branches", `${newName}.json`), JSON.stringify(data, null, 2));
    await fs.unlink(branchFile);

    const current = (await fs.readFile(path.join(repoPath, "HEAD"), "utf-8")).trim();
    if (current === oldName) await fs.writeFile(path.join(repoPath, "HEAD"), newName);

    console.log(`Branch '${oldName}' renamed to '${newName}'.`);
  } catch (err) { console.error("Error renaming branch:", err); }
}

async function checkoutBranch(name) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const branchFile = path.join(repoPath, "branches", `${name}.json`);
    const exists = await fs.access(branchFile).then(() => true).catch(() => false);
    if (!exists) { console.log(`Branch '${name}' not found. Create it with: branch-create ${name}`); return; }

    const branchData = JSON.parse(await fs.readFile(branchFile, "utf-8"));
    if (branchData.commitId) {
      const commitDir = path.join(repoPath, "commits", branchData.commitId);
      const files = (await fs.readdir(commitDir)).filter(f => f !== "commit.json");
      const workDir = path.resolve(repoPath, "..");
      for (const file of files) {
        await fs.copyFile(path.join(commitDir, file), path.join(workDir, file));
      }
    }

    await fs.writeFile(path.join(repoPath, "HEAD"), name);
    console.log(`Switched to branch '${name}'.`);
  } catch (err) { console.error("Error checking out:", err); }
}

async function mergeBranch(name) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const current = (await fs.readFile(path.join(repoPath, "HEAD"), "utf-8")).trim();
    const branchFile = path.join(repoPath, "branches", `${name}.json`);
    const exists = await fs.access(branchFile).then(() => true).catch(() => false);
    if (!exists) { console.log(`Branch '${name}' not found.`); return; }

    const branchData = JSON.parse(await fs.readFile(branchFile, "utf-8"));
    if (!branchData.commitId) { console.log(`Branch '${name}' has no commits.`); return; }

    const commitDir = path.join(repoPath, "commits", branchData.commitId);
    const stagingPath = path.join(repoPath, "staging");
    await fs.mkdir(stagingPath, { recursive: true });

    const files = (await fs.readdir(commitDir)).filter(f => f !== "commit.json");
    for (const file of files) {
      await fs.copyFile(path.join(commitDir, file), path.join(stagingPath, file));
    }

    console.log(`Merged '${name}' into '${current}'. ${files.length} file(s) staged — run commit to finalize.`);
  } catch (err) { console.error("Error merging:", err); }
}

module.exports = { listBranches, createBranch, deleteBranch, renameBranch, checkoutBranch, mergeBranch };

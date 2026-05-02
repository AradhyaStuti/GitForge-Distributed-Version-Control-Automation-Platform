const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");

async function stashSave() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const stagingPath = path.join(repoPath, "staging");
  try {
    const staged = await fs.readdir(stagingPath);
    if (staged.length === 0) { console.log("Nothing to stash."); return; }

    const stashId = uuidv4().slice(0, 8);
    const stashDir = path.join(repoPath, "stash", stashId);
    await fs.mkdir(stashDir, { recursive: true });

    for (const file of staged) {
      await fs.copyFile(path.join(stagingPath, file), path.join(stashDir, file));
      await fs.unlink(path.join(stagingPath, file));
    }

    const stashListFile = path.join(repoPath, "stash", "stash.json");
    const list = JSON.parse(await fs.readFile(stashListFile, "utf-8"));
    list.push({ id: stashId, date: new Date().toISOString(), files: staged });
    await fs.writeFile(stashListFile, JSON.stringify(list, null, 2));

    console.log(`Saved to stash@{${list.length - 1}} (id: ${stashId})`);
  } catch (err) { console.error("Error stashing:", err); }
}

async function stashPop() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const stashListFile = path.join(repoPath, "stash", "stash.json");
    const list = JSON.parse(await fs.readFile(stashListFile, "utf-8"));
    if (list.length === 0) { console.log("No stash entries."); return; }

    const latest = list.pop();
    const stashDir = path.join(repoPath, "stash", latest.id);
    const stagingPath = path.join(repoPath, "staging");

    const files = await fs.readdir(stashDir);
    for (const file of files) {
      await fs.copyFile(path.join(stashDir, file), path.join(stagingPath, file));
      await fs.unlink(path.join(stashDir, file));
    }
    await fs.rmdir(stashDir);
    await fs.writeFile(stashListFile, JSON.stringify(list, null, 2));
    console.log(`Restored stash@{${list.length}} to staging.`);
  } catch (err) { console.error("Error popping stash:", err); }
}

async function stashList() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const list = JSON.parse(await fs.readFile(path.join(repoPath, "stash", "stash.json"), "utf-8"));
    if (list.length === 0) { console.log("No stash entries."); return; }
    list.forEach((s, i) => console.log(`stash@{${i}}: ${s.id}  ${s.date.slice(0, 19)}  [${s.files.join(", ")}]`));
  } catch (err) { console.error("Error listing stash:", err); }
}

async function stashDrop() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const stashListFile = path.join(repoPath, "stash", "stash.json");
    const list = JSON.parse(await fs.readFile(stashListFile, "utf-8"));
    if (list.length === 0) { console.log("No stash entries to drop."); return; }

    const latest = list.pop();
    const stashDir = path.join(repoPath, "stash", latest.id);
    try {
      const files = await fs.readdir(stashDir);
      for (const file of files) await fs.unlink(path.join(stashDir, file));
      await fs.rmdir(stashDir);
    } catch (_) { /* ignored */ }

    await fs.writeFile(stashListFile, JSON.stringify(list, null, 2));
    console.log(`Dropped stash@{${list.length}} (id: ${latest.id})`);
  } catch (err) { console.error("Error dropping stash:", err); }
}

module.exports = { stashSave, stashPop, stashList, stashDrop };

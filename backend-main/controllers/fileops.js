const fs = require("fs").promises;
const path = require("path");

async function addAll() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const stagingPath = path.join(repoPath, "staging");
  const workDir = process.cwd();
  const ignored = new Set([".gitforge", "node_modules", ".git"]);

  try {
    await fs.mkdir(stagingPath, { recursive: true });
    const entries = await fs.readdir(workDir);
    let count = 0;
    for (const entry of entries) {
      if (ignored.has(entry)) continue;
      const stat = await fs.stat(path.join(workDir, entry));
      if (stat.isFile()) {
        await fs.copyFile(path.join(workDir, entry), path.join(stagingPath, entry));
        count++;
      }
    }
    console.log(`Added ${count} file(s) to staging.`);
  } catch (err) { console.error("Error adding all files:", err); }
}

async function rmFile(filename) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    await fs.unlink(path.join(repoPath, "staging", filename));
    console.log(`Removed '${filename}' from staging.`);
  } catch (err) { console.error(`'${filename}' not in staging.`); }
}

async function mvFile(src, dest) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const stagingPath = path.join(repoPath, "staging");
  try {
    await fs.copyFile(path.join(stagingPath, src), path.join(stagingPath, dest));
    await fs.unlink(path.join(stagingPath, src));
    console.log(`Renamed '${src}' -> '${dest}' in staging.`);
  } catch (err) { console.error("Error renaming file in staging:", err); }
}

async function cleanStaging() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const stagingPath = path.join(repoPath, "staging");
  try {
    const files = await fs.readdir(stagingPath);
    if (files.length === 0) { console.log("Staging area already clean."); return; }
    for (const file of files) await fs.unlink(path.join(stagingPath, file));
    console.log(`Cleaned staging area (removed ${files.length} file(s)).`);
  } catch (err) { console.error("Error cleaning staging:", err); }
}

async function restoreFile(filename) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitsPath = path.join(repoPath, "commits");
  try {
    const commitDirs = await fs.readdir(commitsPath);
    let latest = null;
    let latestDate = null;

    for (const commitId of commitDirs) {
      try {
        const meta = JSON.parse(await fs.readFile(path.join(commitsPath, commitId, "commit.json"), "utf-8"));
        const fp = path.join(commitsPath, commitId, filename);
        const exists = await fs.access(fp).then(() => true).catch(() => false);
        if (exists && (!latestDate || new Date(meta.date) > new Date(latestDate))) {
          latest = fp;
          latestDate = meta.date;
        }
      } catch (_) { /* ignored */ }
    }

    if (!latest) { console.log(`'${filename}' not found in any commit.`); return; }
    await fs.copyFile(latest, path.join(process.cwd(), filename));
    console.log(`Restored '${filename}' from last commit.`);
  } catch (err) { console.error("Error restoring file:", err); }
}

module.exports = { addAll, rmFile, mvFile, cleanStaging, restoreFile };

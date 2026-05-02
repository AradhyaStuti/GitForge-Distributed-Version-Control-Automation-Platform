const fs = require("fs").promises;
const path = require("path");

async function resetRepo(commitID) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitDir = path.join(repoPath, "commits", commitID);
  try {
    const files = (await fs.readdir(commitDir)).filter(f => f !== "commit.json");
    const workDir = path.resolve(repoPath, "..");
    for (const file of files) {
      await fs.copyFile(path.join(commitDir, file), path.join(workDir, file));
    }

    const current = (await fs.readFile(path.join(repoPath, "HEAD"), "utf-8")).trim();
    await fs.writeFile(
      path.join(repoPath, "branches", `${current}.json`),
      JSON.stringify({ name: current, commitId: commitID }, null, 2)
    );

    let reflog = [];
    try { reflog = JSON.parse(await fs.readFile(path.join(repoPath, "reflog.json"), "utf-8")); } catch (_) { /* ignored */ }
    reflog.push({ action: "reset", commitId: commitID, date: new Date().toISOString() });
    await fs.writeFile(path.join(repoPath, "reflog.json"), JSON.stringify(reflog, null, 2));

    const meta = JSON.parse(await fs.readFile(path.join(commitDir, "commit.json"), "utf-8"));
    console.log(`HEAD is now at ${commitID.slice(0, 7)}: ${meta.message}`);
  } catch (err) { console.error("Error resetting:", err); }
}

async function cherryPickRepo(commitID) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitDir = path.join(repoPath, "commits", commitID);
  const stagingPath = path.join(repoPath, "staging");
  try {
    await fs.mkdir(stagingPath, { recursive: true });
    const files = (await fs.readdir(commitDir)).filter(f => f !== "commit.json");
    for (const file of files) {
      await fs.copyFile(path.join(commitDir, file), path.join(stagingPath, file));
    }
    const meta = JSON.parse(await fs.readFile(path.join(commitDir, "commit.json"), "utf-8"));
    console.log(`Cherry-picked ${commitID.slice(0, 7)} ("${meta.message}"). Files staged — run commit to apply.`);
  } catch (err) { console.error("Error cherry-picking:", err); }
}

async function archiveRepo(commitID) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitDir = path.join(repoPath, "commits", commitID);
  const archiveDir = path.join(process.cwd(), `archive-${commitID.slice(0, 7)}`);
  try {
    await fs.mkdir(archiveDir, { recursive: true });
    const files = (await fs.readdir(commitDir)).filter(f => f !== "commit.json");
    for (const file of files) {
      await fs.copyFile(path.join(commitDir, file), path.join(archiveDir, file));
    }
    console.log(`Archived ${files.length} file(s) to ./${path.basename(archiveDir)}/`);
  } catch (err) { console.error("Error archiving:", err); }
}

async function describeRepo() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const current = (await fs.readFile(path.join(repoPath, "HEAD"), "utf-8")).trim();
    const b = JSON.parse(await fs.readFile(path.join(repoPath, "branches", `${current}.json`), "utf-8"));
    if (!b.commitId) { console.log("No commits yet."); return; }

    const tagFiles = await fs.readdir(path.join(repoPath, "tags")).catch(() => []);
    let matchingTag = null;
    for (const tf of tagFiles) {
      const t = JSON.parse(await fs.readFile(path.join(repoPath, "tags", tf), "utf-8"));
      if (t.commitId === b.commitId) { matchingTag = t.name; break; }
    }

    if (matchingTag) {
      console.log(matchingTag);
    } else {
      const meta = JSON.parse(await fs.readFile(path.join(repoPath, "commits", b.commitId, "commit.json"), "utf-8"));
      console.log(`${current}-${b.commitId.slice(0, 7)}: ${meta.message}`);
    }
  } catch (err) { console.error("Error describing:", err); }
}

async function blameFile(filename) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitsPath = path.join(repoPath, "commits");
  try {
    const commitDirs = await fs.readdir(commitsPath);
    const commits = [];

    for (const commitId of commitDirs) {
      try {
        const meta = JSON.parse(await fs.readFile(path.join(commitsPath, commitId, "commit.json"), "utf-8"));
        const fp = path.join(commitsPath, commitId, filename);
        const exists = await fs.access(fp).then(() => true).catch(() => false);
        if (exists) commits.push({ commitId, meta, content: await fs.readFile(fp, "utf-8") });
      } catch (_) { /* ignored */ }
    }

    if (commits.length === 0) { console.log(`'${filename}' not found in any commit.`); return; }

    commits.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
    const latest = commits[0];

    latest.content.split("\n").forEach((line, i) => {
      console.log(`${latest.commitId.slice(0, 7)} (${latest.meta.date.slice(0, 10)}) ${String(i + 1).padStart(4)} | ${line}`);
    });
  } catch (err) { console.error("Error running blame:", err); }
}

async function grepRepo(pattern) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitsPath = path.join(repoPath, "commits");
  try {
    const re = new RegExp(pattern, "gi");
    const commitDirs = await fs.readdir(commitsPath);
    let found = false;

    for (const commitId of commitDirs) {
      const files = (await fs.readdir(path.join(commitsPath, commitId))).filter(f => f !== "commit.json");
      for (const file of files) {
        try {
          const content = await fs.readFile(path.join(commitsPath, commitId, file), "utf-8");
          content.split("\n").forEach((line, i) => {
            if (re.test(line)) {
              console.log(`${commitId.slice(0, 7)}:${file}:${i + 1}: ${line.trim()}`);
              found = true;
            }
          });
        } catch (_) { /* ignored */ }
      }
    }

    if (!found) console.log("No matches found.");
  } catch (err) { console.error("Error running grep:", err); }
}

async function fetchRepo() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitsPath = path.join(repoPath, "commits");
  const mongoose = require("mongoose");
  const dotenv = require("dotenv");
  dotenv.config();
  const CommitFile = require("../models/commitFileModel");

  try {
    const config = JSON.parse(await fs.readFile(path.join(repoPath, "config.json"), "utf-8"));
    await mongoose.connect(process.env.MONGODB_URI);
    const files = await CommitFile.find({ repoName: config.repoName });

    let fetched = 0;
    for (const file of files) {
      const localPath = path.join(commitsPath, file.commitId, file.filename);
      const exists = await fs.access(localPath).then(() => true).catch(() => false);
      if (!exists) {
        await fs.mkdir(path.join(commitsPath, file.commitId), { recursive: true });
        await fs.writeFile(localPath, file.content);
        fetched++;
      }
    }
    console.log(`Fetched ${fetched} new object(s). Use pull to apply to working directory.`);
  } catch (err) { console.error("Error fetching:", err); }
  finally { try { await mongoose.disconnect(); } catch (_) { /* ignored */ } }
}

async function cloneRepo(repoName) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  const commitsPath = path.join(repoPath, "commits");
  const mongoose = require("mongoose");
  const dotenv = require("dotenv");
  dotenv.config();
  const CommitFile = require("../models/commitFileModel");

  try {
    await fs.mkdir(commitsPath,                          { recursive: true });
    await fs.mkdir(path.join(repoPath, "staging"),       { recursive: true });
    await fs.mkdir(path.join(repoPath, "branches"),      { recursive: true });
    await fs.mkdir(path.join(repoPath, "tags"),          { recursive: true });
    await fs.mkdir(path.join(repoPath, "stash"),         { recursive: true });

    await mongoose.connect(process.env.MONGODB_URI);
    const files = await CommitFile.find({ repoName });

    if (files.length === 0) { console.log(`No data found for repository '${repoName}'.`); return; }

    for (const file of files) {
      const commitDir = path.join(commitsPath, file.commitId);
      await fs.mkdir(commitDir, { recursive: true });
      await fs.writeFile(path.join(commitDir, file.filename), file.content);
    }

    await fs.writeFile(path.join(repoPath, "config.json"),         JSON.stringify({ repoName }, null, 2));
    await fs.writeFile(path.join(repoPath, "HEAD"),                "main");
    await fs.writeFile(path.join(repoPath, "branches", "main.json"), JSON.stringify({ name: "main", commitId: null }, null, 2));
    await fs.writeFile(path.join(repoPath, "remotes.json"),         JSON.stringify({ origin: { url: repoName } }, null, 2));
    await fs.writeFile(path.join(repoPath, "reflog.json"),          JSON.stringify([], null, 2));
    await fs.writeFile(path.join(repoPath, "stash", "stash.json"),  JSON.stringify([], null, 2));

    console.log(`Cloned '${repoName}' — ${files.length} object(s) downloaded.`);
  } catch (err) { console.error("Error cloning:", err); }
  finally { try { await mongoose.disconnect(); } catch (_) { /* ignored */ } }
}

module.exports = { resetRepo, cherryPickRepo, archiveRepo, describeRepo, blameFile, grepRepo, fetchRepo, cloneRepo };

const fs = require("fs").promises;
const path = require("path");

async function listRemotes() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const remotes = JSON.parse(await fs.readFile(path.join(repoPath, "remotes.json"), "utf-8"));
    const entries = Object.entries(remotes);
    if (entries.length === 0) { console.log("No remotes configured."); return; }
    entries.forEach(([name, data]) => console.log(`${name}\t${data.url}`));
  } catch (err) { console.error("Error listing remotes:", err); }
}

async function addRemote(name, url) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const remotesFile = path.join(repoPath, "remotes.json");
    const remotes = JSON.parse(await fs.readFile(remotesFile, "utf-8"));
    if (remotes[name]) { console.log(`Remote '${name}' already exists.`); return; }
    remotes[name] = { url };
    await fs.writeFile(remotesFile, JSON.stringify(remotes, null, 2));
    console.log(`Remote '${name}' added: ${url}`);
  } catch (err) { console.error("Error adding remote:", err); }
}

async function removeRemote(name) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const remotesFile = path.join(repoPath, "remotes.json");
    const remotes = JSON.parse(await fs.readFile(remotesFile, "utf-8"));
    if (!remotes[name]) { console.log(`Remote '${name}' not found.`); return; }
    delete remotes[name];
    await fs.writeFile(remotesFile, JSON.stringify(remotes, null, 2));
    console.log(`Remote '${name}' removed.`);
  } catch (err) { console.error("Error removing remote:", err); }
}

module.exports = { listRemotes, addRemote, removeRemote };

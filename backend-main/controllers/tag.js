const fs = require("fs").promises;
const path = require("path");

async function createTag(name) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const current = (await fs.readFile(path.join(repoPath, "HEAD"), "utf-8")).trim();
    const b = JSON.parse(await fs.readFile(path.join(repoPath, "branches", `${current}.json`), "utf-8"));
    if (!b.commitId) { console.log("No commits yet. Cannot create tag."); return; }
    await fs.writeFile(
      path.join(repoPath, "tags", `${name}.json`),
      JSON.stringify({ name, commitId: b.commitId, date: new Date().toISOString() }, null, 2)
    );
    console.log(`Tag '${name}' created at ${b.commitId.slice(0, 7)}.`);
  } catch (err) { console.error("Error creating tag:", err); }
}

async function listTags() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const files = await fs.readdir(path.join(repoPath, "tags"));
    if (files.length === 0) { console.log("No tags."); return; }
    for (const f of files) {
      const t = JSON.parse(await fs.readFile(path.join(repoPath, "tags", f), "utf-8"));
      console.log(`${t.name}  ->  ${t.commitId.slice(0, 7)}  (${t.date.slice(0, 10)})`);
    }
  } catch (err) { console.error("Error listing tags:", err); }
}

async function deleteTag(name) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    await fs.unlink(path.join(repoPath, "tags", `${name}.json`));
    console.log(`Tag '${name}' deleted.`);
  } catch (err) { console.error("Error deleting tag:", err); }
}

async function showTag(name) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const t = JSON.parse(await fs.readFile(path.join(repoPath, "tags", `${name}.json`), "utf-8"));
    console.log(`Tag:    ${t.name}`);
    console.log(`Commit: ${t.commitId}`);
    console.log(`Date:   ${t.date}`);
    const meta = JSON.parse(await fs.readFile(path.join(repoPath, "commits", t.commitId, "commit.json"), "utf-8"));
    console.log(`\n    ${meta.message}`);
  } catch (err) { console.error("Error showing tag:", err); }
}

module.exports = { createTag, listTags, deleteTag, showTag };

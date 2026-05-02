const fs = require("fs").promises;
const path = require("path");

async function setConfig(key, value) {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const configFile = path.join(repoPath, "config.json");
    const config = JSON.parse(await fs.readFile(configFile, "utf-8"));
    config[key] = value;
    await fs.writeFile(configFile, JSON.stringify(config, null, 2));
    console.log(`Set: ${key} = ${value}`);
  } catch (err) { console.error("Error setting config:", err); }
}

async function listConfig() {
  const repoPath = path.resolve(process.cwd(), ".gitforge");
  try {
    const config = JSON.parse(await fs.readFile(path.join(repoPath, "config.json"), "utf-8"));
    Object.entries(config).forEach(([k, v]) => console.log(`${k} = ${v}`));
  } catch (err) { console.error("Error reading config:", err); }
}

module.exports = { setConfig, listConfig };

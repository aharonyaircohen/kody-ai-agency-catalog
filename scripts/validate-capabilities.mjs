import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const capabilitiesRoot = join(root, "capabilities");
const allowedRootFiles = new Set(["instructions.md"]);
let count = 0;

for (const entry of await readdir(capabilitiesRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  count += 1;
  const dir = join(capabilitiesRoot, entry.name);
  const entries = await readdir(dir, { withFileTypes: true });
  for (const item of entries) {
    if (
      !allowedRootFiles.has(item.name) &&
      !(item.isDirectory() && (item.name === "skills" || item.name === "tools"))
    ) {
      throw new Error(`${entry.name}: unexpected root item ${item.name}`);
    }
  }
  const instructions = (await readFile(join(dir, "instructions.md"), "utf8")).trim();
  if (!instructions) throw new Error(`${entry.name}: instructions.md is empty`);
  for (const requiredDir of ["skills", "tools"]) {
    const item = entries.find((candidate) => candidate.name === requiredDir);
    if (!item?.isDirectory()) {
      throw new Error(`${entry.name}: ${requiredDir}/ is missing`);
    }
  }
}

console.log(JSON.stringify({ capabilities: count, valid: true }));

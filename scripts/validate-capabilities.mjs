import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const capabilitiesRoot = join(root, "capabilities");
const allowedRootFiles = new Set(["instructions.md", "contract.json"]);
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
  const contract = JSON.parse(await readFile(join(dir, "contract.json"), "utf8"));
  if (
    Object.keys(contract).sort().join(",") !== "input,output" ||
    !validValue(contract.input) ||
    !validValue(contract.output)
  ) {
    throw new Error(`${entry.name}: contract.json must have one input and one output`);
  }
}

console.log(JSON.stringify({ capabilities: count, valid: true }));

function validValue(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => key === "name" || key === "schema") &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    value.schema &&
    typeof value.schema === "object" &&
    !Array.isArray(value.schema)
  );
}

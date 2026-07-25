import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const capabilitiesRoot = join(root, "capabilities");

for (const entry of await readdir(capabilitiesRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = join(capabilitiesRoot, entry.name);
  const contractPath = join(dir, "contract.json");
  let contract = null;
  try {
    contract = JSON.parse(await readFile(contractPath, "utf8"));
  } catch {}

  const instructionsPath = join(dir, "instructions.md");
  const instructions = normalizeLegacyLanguage(
    (await readFile(instructionsPath, "utf8")).trimEnd(),
  );
  const inputSection = formatInputSection(contract?.input?.schema);
  await writeFile(
    instructionsPath,
    `${instructions}${inputSection ? `\n\n${inputSection}` : ""}\n`,
  );
  if (contract) await rm(contractPath);
}

for (const entry of await readdir(join(root, "workflows"), {
  withFileTypes: true,
})) {
  if (!entry.isDirectory()) continue;
  const file = join(root, "workflows", entry.name, "workflow.json");
  const workflow = JSON.parse(await readFile(file, "utf8"));
  for (const step of workflow.steps ?? []) {
    if (step.cliArgs !== undefined && step.input === undefined) {
      step.input = step.cliArgs;
    }
    delete step.cliArgs;
    delete step.inputs;
  }
  await writeFile(file, `${JSON.stringify(workflow, null, 2)}\n`);
}

function formatInputSection(schema) {
  const properties =
    schema &&
    typeof schema === "object" &&
    !Array.isArray(schema) &&
    schema.properties &&
    typeof schema.properties === "object" &&
    !Array.isArray(schema.properties)
      ? schema.properties
      : {};
  if (Object.keys(properties).length === 0) return "";
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  const lines = [
    "## Input",
    "",
    "This capability receives one JSON value. When it is an object, it understands:",
    "",
  ];
  for (const [name, value] of Object.entries(properties)) {
    const field = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const type = Array.isArray(field.enum)
      ? field.enum.map(String).join(" | ")
      : typeof field.type === "string"
        ? field.type
        : "value";
    const needed = required.has(name) ? ", needed" : "";
    const description =
      typeof field.description === "string" && field.description.trim()
        ? `: ${field.description.trim()}`
        : "";
    lines.push(`- \`${name}\` (${type}${needed})${description}`);
  }
  return lines.join("\n");
}

function normalizeLegacyLanguage(instructions) {
  return instructions
    .replace(/^## Implementation$/gm, "## Execution")
    .replace(
      /Use the local `[^`]+` implementation for the mechanical ([^.]+)\./g,
      "Use the capability-owned files in `tools/` for the mechanical $1.",
    )
    .replace(
      /Use the `[^`]+` implementation(?: for the)? (?:implementation|execution) details\.\n(?:The capability owns the public action name and the reason this action exists; the implementation owns the method\.)?/g,
      "Follow these instructions and use the capability-owned files in `tools/` when needed.",
    )
    .replace(
      /Use the `[^`]+` implementation details\./g,
      "Follow these instructions and use the capability-owned files in `tools/` when needed.",
    )
    .replace(
      /Run (?:the )?`[^`]+` implementation\.?(?: (?:Its|The) [^\n]+\.)?/g,
      "Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.",
    )
    .replace(
      /(Every tick|Once per day), run the local `[^`]+` implementation tick:/g,
      "$1, follow these instructions:",
    )
    .replace(
      /The implementation is the source of truth for ([^.]+)\./g,
      "These instructions and the capability-owned tools define $1.",
    );
}

import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(join(root, "kody-store.json"), "utf8"));
const capabilityRoot = join(root, manifest.assetRoots.capabilities);
const workflowRoot = join(root, manifest.assetRoots.workflows);
const loopRoot = join(root, manifest.assetRoots.loops);

const capabilities = new Set(await directories(capabilityRoot));
const workflows = new Set(await directories(workflowRoot));
const loops = new Set(await directories(loopRoot));

for (const slug of capabilities) {
  const entries = (await readdir(join(capabilityRoot, slug), { withFileTypes: true }))
    .map((entry) => entry.name)
    .sort();
  const allowed = new Set(["contract.json", "instructions.md", "skills", "tools"]);
  if (entries.some((entry) => !allowed.has(entry)) || !entries.includes("instructions.md")) {
    throw new Error(`${slug}: Capability folder contains unsupported files`);
  }
  if (entries.includes("contract.json")) {
    readContract(slug);
  }
}

for (const slug of workflows) {
  const workflow = JSON.parse(await readFile(join(workflowRoot, slug, "workflow.json"), "utf8"));
  if (!workflow.agent) throw new Error(`${slug}: Workflow must select one Agent`);
  for (const step of workflow.steps ?? []) {
    if (!capabilities.has(step.capability)) {
      throw new Error(`${slug}: missing catalog Capability ${step.capability}`);
    }
    for (const transition of Array.isArray(step.next) ? step.next : []) {
      for (const path of Object.keys(transition.when ?? {})) {
        if (!path.startsWith("result.")) continue;
        const contract = readContract(step.capability);
        if (!schemaDeclaresPath(contract.output, path.slice("result.".length))) {
          throw new Error(`${slug}: ${step.capability} does not declare ${path}`);
        }
      }
    }
  }
}

for (const slug of loops) {
  const loop = JSON.parse(await readFile(join(loopRoot, slug, "loop.json"), "utf8"));
  if (loop.id !== slug) throw new Error(`${slug}: Loop id does not match folder`);
  const targets = loop.target?.kind === "workflow" ? workflows : capabilities;
  if (!targets.has(loop.target?.id)) {
    throw new Error(`${slug}: missing catalog target ${loop.target?.kind}:${loop.target?.id}`);
  }
}

const warehouse = {
  capabilities: (await directories(join(root, "warehouse", "capabilities"))).length,
  workflows: (await directories(join(root, "warehouse", "workflows"))).length,
  loops: (await directories(join(root, "warehouse", "loops"))).length,
};
if (Object.values(warehouse).some((count) => count === 0)) {
  throw new Error("warehouse must preserve the previous Agency inventory");
}

process.stdout.write(
  `${JSON.stringify({
    catalog: { capabilities: capabilities.size, workflows: workflows.size, loops: loops.size },
    warehouse,
    valid: true,
  })}\n`,
);

async function directories(path) {
  return (await readdir(path, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readContract(slug) {
  const path = join(capabilityRoot, slug, "contract.json");
  let contract;
  try {
    contract = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`${slug}: Capability conditions require a valid contract.json`);
  }
  if (!record(contract?.input) || !record(contract?.output)) {
    throw new Error(`${slug}: contract.json must contain input and output schemas`);
  }
  return contract;
}

function schemaDeclaresPath(schema, dottedPath) {
  let current = schema;
  for (const part of dottedPath.split(".")) {
    if (!record(current?.properties) || !record(current.properties[part])) return false;
    current = current.properties[part];
  }
  return true;
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

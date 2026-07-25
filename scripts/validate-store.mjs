import { readFile, readdir } from "node:fs/promises";
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
  if (JSON.stringify(entries) !== JSON.stringify(["instructions.md", "skills", "tools"])) {
    throw new Error(`${slug}: Capability folder must contain only instructions.md, skills, and tools`);
  }
}

for (const slug of workflows) {
  const workflow = JSON.parse(await readFile(join(workflowRoot, slug, "workflow.json"), "utf8"));
  if (!workflow.agent) throw new Error(`${slug}: Workflow must select one Agent`);
  for (const step of workflow.steps ?? []) {
    if (!capabilities.has(step.capability)) {
      throw new Error(`${slug}: missing catalog Capability ${step.capability}`);
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

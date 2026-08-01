import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  await readFile(join(root, "kody-store.json"), "utf8"),
);
const capabilityRoot = join(root, manifest.assetRoots.capabilities);
const workflowRoot = join(root, manifest.assetRoots.workflows);
const loopRoot = join(root, manifest.assetRoots.loops);
const solutionRoot = join(root, manifest.assetRoots.solutions);
const agentRoot = join(root, manifest.assetRoots.agent);

const capabilities = new Set(await directories(capabilityRoot));
const workflows = new Set(await directories(workflowRoot));
const loops = new Set(await directories(loopRoot));
const solutions = new Set(await directories(solutionRoot));
const agents = new Set(
  (await readdir(agentRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name.slice(0, -3)),
);

for (const slug of capabilities) {
  const entries = (
    await readdir(join(capabilityRoot, slug), { withFileTypes: true })
  )
    .map((entry) => entry.name)
    .sort();
  const allowed = new Set([
    "contract.json",
    "instructions.md",
    "skills",
    "tools",
  ]);
  if (
    entries.some((entry) => !allowed.has(entry)) ||
    !entries.includes("instructions.md")
  ) {
    throw new Error(`${slug}: Capability folder contains unsupported files`);
  }
  if (entries.includes("contract.json")) {
    readContract(slug);
  }
}

for (const slug of workflows) {
  const workflow = JSON.parse(
    await readFile(join(workflowRoot, slug, "workflow.json"), "utf8"),
  );
  if (!workflow.agent)
    throw new Error(`${slug}: Workflow must select one Agent`);
  if (!agents.has(workflow.agent)) {
    throw new Error(`${slug}: missing catalog Agent ${workflow.agent}`);
  }
  for (const step of workflow.steps ?? []) {
    if (!capabilities.has(step.capability)) {
      throw new Error(`${slug}: missing catalog Capability ${step.capability}`);
    }
    for (const transition of Array.isArray(step.next) ? step.next : []) {
      for (const path of Object.keys(transition.when ?? {})) {
        if (!path.startsWith("result.")) continue;
        const contract = readContract(step.capability);
        if (
          !schemaDeclaresPath(contract.output, path.slice("result.".length))
        ) {
          throw new Error(
            `${slug}: ${step.capability} does not declare ${path}`,
          );
        }
      }
    }
  }
}

for (const slug of loops) {
  const loop = JSON.parse(
    await readFile(join(loopRoot, slug, "loop.json"), "utf8"),
  );
  if (loop.id !== slug)
    throw new Error(`${slug}: Loop id does not match folder`);
  const targets = loop.target?.kind === "workflow" ? workflows : capabilities;
  if (!targets.has(loop.target?.id)) {
    throw new Error(
      `${slug}: missing catalog target ${loop.target?.kind}:${loop.target?.id}`,
    );
  }
}

for (const slug of solutions) {
  const folder = join(solutionRoot, slug);
  const entries = (await readdir(folder, { withFileTypes: true }))
    .map((entry) => entry.name)
    .sort();
  if (entries.length !== 1 || entries[0] !== "solution.json") {
    throw new Error(`${slug}: Solution folder must contain only solution.json`);
  }
  const solution = JSON.parse(
    await readFile(join(folder, "solution.json"), "utf8"),
  );
  if (solution.schemaVersion !== 1) {
    throw new Error(`${slug}: Solution schemaVersion must be 1`);
  }
  if (solution.id !== slug)
    throw new Error(`${slug}: Solution id does not match folder`);
  if (typeof solution.name !== "string" || !solution.name.trim()) {
    throw new Error(`${slug}: Solution name is required`);
  }
  if (
    typeof solution.description !== "string" ||
    !solution.description.trim()
  ) {
    throw new Error(`${slug}: Solution description is required`);
  }
  if (
    !Array.isArray(solution.entrypoints) ||
    solution.entrypoints.length === 0
  ) {
    throw new Error(`${slug}: Solution must declare at least one entrypoint`);
  }
  if ("category" in solution || "dependencies" in solution) {
    throw new Error(
      `${slug}: Solution categories and dependencies are derived, not declared`,
    );
  }
  for (const entrypoint of solution.entrypoints) {
    const targets = entrypoint?.kind === "loop" ? loops : workflows;
    if (
      (entrypoint?.kind !== "loop" && entrypoint?.kind !== "workflow") ||
      typeof entrypoint.id !== "string" ||
      !targets.has(entrypoint.id)
    ) {
      throw new Error(
        `${slug}: missing catalog entrypoint ${entrypoint?.kind}:${entrypoint?.id}`,
      );
    }
  }
}

const warehouse = {
  capabilities: (await directories(join(root, "warehouse", "capabilities")))
    .length,
  workflows: (await directories(join(root, "warehouse", "workflows"))).length,
  loops: (await directories(join(root, "warehouse", "loops"))).length,
};
if (Object.values(warehouse).some((count) => count === 0)) {
  throw new Error("warehouse must preserve the previous Agency inventory");
}

process.stdout.write(
  `${JSON.stringify({
    catalog: {
      capabilities: capabilities.size,
      workflows: workflows.size,
      loops: loops.size,
      solutions: solutions.size,
    },
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
    throw new Error(
      `${slug}: Capability conditions require a valid contract.json`,
    );
  }
  if (!record(contract?.input) || !record(contract?.output)) {
    throw new Error(
      `${slug}: contract.json must contain input and output schemas`,
    );
  }
  if (contract.execution !== "agent" && contract.execution !== "script") {
    throw new Error(`${slug}: contract.json execution must be agent or script`);
  }
  if (contract.execution === "script") {
    try {
      if (
        !readFileSync(
          join(capabilityRoot, slug, "tools", "run.sh"),
          "utf8",
        ).trim()
      ) {
        throw new Error("empty");
      }
    } catch {
      throw new Error(`${slug}: script execution requires tools/run.sh`);
    }
  }
  return contract;
}

function schemaDeclaresPath(schema, dottedPath) {
  let current = schema;
  for (const part of dottedPath.split(".")) {
    if (!record(current?.properties) || !record(current.properties[part]))
      return false;
    current = current.properties[part];
  }
  return true;
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

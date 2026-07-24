import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const { stdout } = await execFileAsync(
  "git",
  ["ls-tree", "-r", "--name-only", "HEAD", "goals/templates"],
  { cwd: root, encoding: "utf8" },
);

let workflowsCreated = 0;
let loopsCreated = 0;

for (const source of stdout
  .split("\n")
  .filter((path) => path.endsWith("/state.json"))) {
  const id = source.split("/").at(-2);
  if (!id) continue;
  const { stdout: contents } = await execFileAsync(
    "git",
    ["show", `HEAD:${source}`],
    { cwd: root, encoding: "utf8" },
  );
  const legacy = JSON.parse(contents);
  const workflowId = legacy.workflowRef?.id ?? legacy.loopTarget?.id ?? id;
  const workflowFile = join(root, "workflows", workflowId, "workflow.json");
  const workflowExists = await optionalJson(workflowFile);

  if (!workflowExists) {
    const capabilities = routeCapabilities(legacy);
    if (capabilities.length) {
      const workflow = {
        name: title(id),
        agent: "kody",
        steps: capabilities.map((capability) => ({ capability })),
      };
      await mkdir(dirname(workflowFile), { recursive: true });
      await writeFile(workflowFile, `${JSON.stringify(workflow, null, 2)}\n`);
      workflowsCreated += 1;
    }
  }

  if (typeof legacy.schedule !== "string" || !legacy.schedule.trim()) continue;
  const target = resolveTarget(legacy, id);
  if (!target) {
    throw new Error(`${id}: scheduled legacy item has no executable target`);
  }
  const loop = {
    id,
    trigger: { type: "schedule", every: legacy.schedule.trim() },
    target,
    input: {},
    enabled: legacy.state === "active",
  };
  const loopFile = join(root, "loops", id, "loop.json");
  await mkdir(dirname(loopFile), { recursive: true });
  await writeFile(loopFile, `${JSON.stringify(loop, null, 2)}\n`);
  loopsCreated += 1;
}

process.stdout.write(
  `${JSON.stringify({ workflowsCreated, loopsCreated })}\n`,
);

function routeCapabilities(legacy) {
  if (Array.isArray(legacy.route) && legacy.route.length) {
    return legacy.route
      .map((step) => step.implementation ?? step.capability)
      .filter((value) => typeof value === "string" && value.trim());
  }
  return Array.isArray(legacy.capabilities)
    ? legacy.capabilities.filter(
        (value) => typeof value === "string" && value.trim(),
      )
    : [];
}

function resolveTarget(legacy, id) {
  if (legacy.loopTarget?.type === "workflow") {
    return { kind: "workflow", id: legacy.loopTarget.id };
  }
  if (legacy.loopTarget?.type === "goal") {
    return { kind: "workflow", id: legacy.loopTarget.id };
  }
  const capabilities = routeCapabilities(legacy);
  if (capabilities.length === 1) {
    return { kind: "capability", id: capabilities[0] };
  }
  if (capabilities.length > 1) return { kind: "workflow", id };
  if (legacy.workflowRef?.id) {
    return { kind: "workflow", id: legacy.workflowRef.id };
  }
  return null;
}

function title(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function optionalJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

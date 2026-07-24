import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const legacy = await legacyInventory();
const current = {
  agents: await countFiles("agents", ".md"),
  commands: await countFiles("commands", ".md"),
  capabilities: await countDirectories("capabilities"),
  workflows: await countDirectories("workflows"),
  loops: await countDirectories("loops"),
};

if (current.agents !== legacy.agents) {
  throw new Error(`agent count changed: ${legacy.agents} -> ${current.agents}`);
}
if (current.commands !== legacy.commands) {
  throw new Error(
    `command count changed: ${legacy.commands} -> ${current.commands}`,
  );
}
if (current.capabilities !== legacy.capabilities) {
  throw new Error(
    `capability count changed: ${legacy.capabilities} -> ${current.capabilities}`,
  );
}
if (current.workflows < legacy.workflows) {
  throw new Error(
    `workflow count shrank: ${legacy.workflows} -> ${current.workflows}`,
  );
}
if (current.loops !== legacy.scheduledGoals) {
  throw new Error(
    `scheduled goal migration incomplete: ${legacy.scheduledGoals} -> ${current.loops}`,
  );
}

await validateReferences();
await validateCapabilityMigration();
await validateGoalMigration();
process.stdout.write(`${JSON.stringify({ legacy, current, valid: true })}\n`);

async function legacyInventory() {
  const { stdout: migrationCommitOutput } = await execFileAsync(
    "git",
    ["log", "-1", "--format=%H", "--diff-filter=D", "--", "implementations"],
    { cwd: root, encoding: "utf8" },
  );
  const migrationCommit = migrationCommitOutput.trim();
  if (!migrationCommit) {
    throw new Error("could not locate the legacy Store migration");
  }
  const legacyRef = `${migrationCommit}^`;
  const { stdout } = await execFileAsync(
    "git",
    ["ls-tree", "-r", "--name-only", legacyRef],
    { cwd: root, encoding: "utf8" },
  );
  const files = stdout.split("\n").filter(Boolean);
  const goalFiles = files.filter(
    (path) =>
      path.startsWith("goals/templates/") && path.endsWith("/state.json"),
  );
  let scheduledGoals = 0;
  for (const path of goalFiles) {
    const { stdout: contents } = await execFileAsync(
      "git",
      ["show", `${legacyRef}:${path}`],
      { cwd: root, encoding: "utf8" },
    );
    if (JSON.parse(contents).schedule) scheduledGoals += 1;
  }
  return {
    agents: files.filter(
      (path) => path.startsWith("agents/") && path.endsWith(".md"),
    ).length,
    commands: files.filter(
      (path) => path.startsWith("commands/") && path.endsWith(".md"),
    ).length,
    capabilities: files.filter(
      (path) =>
        path.startsWith("capabilities/") && path.endsWith("/definition.json"),
    ).length,
    workflows: files.filter(
      (path) =>
        path.startsWith("workflows/") && path.endsWith("/workflow.json"),
    ).length,
    goals: goalFiles.length,
    scheduledGoals,
  };
}

async function validateCapabilityMigration() {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-tree", "-r", "--name-only", "HEAD", "capabilities"],
    { cwd: root, encoding: "utf8" },
  );
  for (const definitionPath of stdout
    .split("\n")
    .filter((path) => path.endsWith("/definition.json"))) {
    const slug = definitionPath.split("/")[1];
    const definition = JSON.parse(await gitText(definitionPath));
    const instructions = await readFile(
      join(root, "capabilities", slug, "instructions.md"),
      "utf8",
    );
    for (const source of [
      `implementations/${slug}/prompt.md`,
      `capabilities/${slug}/capability.md`,
    ]) {
      const text = await optionalGitText(source);
      if (text?.trim() && !instructions.includes(text.trim())) {
        throw new Error(`${slug}: instructions lost ${source}`);
      }
    }
    const contract = JSON.parse(
      await readFile(join(root, "capabilities", slug, "contract.json"), "utf8"),
    );
    if (
      JSON.stringify(contract.input.schema) !==
        JSON.stringify(definition.inputSchema ?? { type: "object" }) ||
      JSON.stringify(contract.output.schema) !==
        JSON.stringify(definition.outputSchema ?? { type: "object" })
    ) {
      throw new Error(`${slug}: contract schema changed`);
    }
    const { stdout: implementationFiles } = await execFileAsync(
      "git",
      ["ls-tree", "-r", "--name-only", "HEAD", `implementations/${slug}`],
      { cwd: root, encoding: "utf8" },
    );
    for (const source of implementationFiles.split("\n").filter(Boolean)) {
      const relative = source.split("/").slice(2).join("/");
      if (
        !relative ||
        ["definition.json", "runtime.json", "prompt.md"].includes(relative)
      ) {
        continue;
      }
      const target = relative.startsWith("skills/")
        ? join(root, "capabilities", slug, relative)
        : join(root, "capabilities", slug, "tools", relative);
      const currentContents = await readFile(target);
      const legacyContents = await gitBuffer(source);
      if (!currentContents.equals(legacyContents)) {
        throw new Error(`${slug}: migrated asset changed ${relative}`);
      }
    }
  }
}

async function validateGoalMigration() {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-tree", "-r", "--name-only", "HEAD", "goals/templates"],
    { cwd: root, encoding: "utf8" },
  );
  for (const source of stdout
    .split("\n")
    .filter((path) => path.endsWith("/state.json"))) {
    const id = source.split("/").at(-2);
    const goal = JSON.parse(await gitText(source));
    const capabilities = routeCapabilities(goal);
    if (goal.schedule) {
      const loop = JSON.parse(
        await readFile(join(root, "loops", id, "loop.json"), "utf8"),
      );
      if (loop.trigger?.every !== goal.schedule) {
        throw new Error(`${id}: schedule changed during Loop migration`);
      }
    }
    const workflowId = goal.workflowRef?.id ?? goal.loopTarget?.id ?? id;
    if (
      capabilities.length > 1 ||
      goal.workflowRef?.id ||
      goal.loopTarget?.type === "workflow" ||
      goal.loopTarget?.type === "goal" ||
      !goal.schedule
    ) {
      const workflow = JSON.parse(
        await readFile(
          join(root, "workflows", workflowId, "workflow.json"),
          "utf8",
        ),
      );
      if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
        throw new Error(`${id}: migrated Workflow has no steps`);
      }
    }
  }
}

async function validateReferences() {
  const capabilities = new Set(
    (await readdir(join(root, "capabilities"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
  const workflows = new Set(
    (await readdir(join(root, "workflows"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
  for (const id of workflows) {
    const workflow = JSON.parse(
      await readFile(join(root, "workflows", id, "workflow.json"), "utf8"),
    );
    for (const step of workflow.steps ?? []) {
      if (!capabilities.has(step.capability)) {
        throw new Error(`${id}: missing capability ${step.capability}`);
      }
    }
  }
  for (const entry of await readdir(join(root, "loops"), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    const loop = JSON.parse(
      await readFile(join(root, "loops", entry.name, "loop.json"), "utf8"),
    );
    if (loop.id !== entry.name) {
      throw new Error(`${entry.name}: loop id does not match folder`);
    }
    if (loop.target?.kind === "workflow" && !workflows.has(loop.target.id)) {
      throw new Error(`${entry.name}: missing workflow ${loop.target.id}`);
    }
    if (
      loop.target?.kind === "capability" &&
      !capabilities.has(loop.target.id)
    ) {
      throw new Error(`${entry.name}: missing capability ${loop.target.id}`);
    }
  }
}

async function countDirectories(relative) {
  return (
    await readdir(join(root, relative), { withFileTypes: true })
  ).filter((entry) => entry.isDirectory()).length;
}

async function countFiles(relative, suffix) {
  return (
    await readdir(join(root, relative), { withFileTypes: true })
  ).filter((entry) => entry.isFile() && entry.name.endsWith(suffix)).length;
}

function routeCapabilities(legacyGoal) {
  if (Array.isArray(legacyGoal.route) && legacyGoal.route.length) {
    return legacyGoal.route
      .map((step) => step.implementation ?? step.capability)
      .filter(Boolean);
  }
  return Array.isArray(legacyGoal.capabilities)
    ? legacyGoal.capabilities
    : [];
}

async function gitText(path) {
  const { stdout } = await execFileAsync("git", ["show", `HEAD:${path}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout;
}

async function optionalGitText(path) {
  try {
    return await gitText(path);
  } catch {
    return null;
  }
}

async function gitBuffer(path) {
  const { stdout } = await execFileAsync("git", ["show", `HEAD:${path}`], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout;
}

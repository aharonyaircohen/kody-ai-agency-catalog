import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const capabilitiesRoot = join(root, "capabilities");
const implementationsRoot = join(root, "implementations");

for (const entry of await readdir(capabilitiesRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const slug = entry.name;
  const capabilityDir = join(capabilitiesRoot, slug);
  const implementationDir = join(implementationsRoot, slug);
  const definition = JSON.parse(
    await readFile(join(capabilityDir, "definition.json"), "utf8"),
  );
  const capabilityBody = await optionalText(
    join(capabilityDir, "capability.md"),
  );
  const implementationPrompt = await optionalText(
    join(implementationDir, "prompt.md"),
  );
  const instructions = [implementationPrompt, capabilityBody]
    .filter((value) => value.trim())
    .join("\n\n---\n\n");
  const contract = {
    input: {
      name: "request",
      schema: definition.inputSchema ?? { type: "object" },
    },
    output: {
      name: "result",
      schema: definition.outputSchema ?? { type: "object" },
    },
  };

  const staging = join(capabilitiesRoot, `.${slug}-simple`);
  await rm(staging, { recursive: true, force: true });
  await mkdir(join(staging, "skills"), { recursive: true });
  await mkdir(join(staging, "tools"), { recursive: true });
  await writeFile(join(staging, "skills", ".gitkeep"), "");
  await writeFile(join(staging, "tools", ".gitkeep"), "");
  await writeFile(join(staging, "instructions.md"), `${instructions.trim()}\n`);
  await writeFile(
    join(staging, "contract.json"),
    `${JSON.stringify(contract, null, 2)}\n`,
  );
  await copyDirectory(join(implementationDir, "skills"), join(staging, "skills"));
  await copyImplementationTools(implementationDir, join(staging, "tools"));
  await rm(capabilityDir, { recursive: true });
  await rename(staging, capabilityDir);
}

await rm(implementationsRoot, { recursive: true, force: true });
await rm(join(root, "goals"), { recursive: true, force: true });

for (const entry of await readdir(join(root, "workflows"), {
  withFileTypes: true,
})) {
  if (!entry.isDirectory()) continue;
  const file = join(root, "workflows", entry.name, "workflow.json");
  const workflow = JSON.parse(await readFile(file, "utf8"));
  delete workflow.version;
  workflow.agent =
    typeof workflow.agent === "string" && workflow.agent.trim()
      ? workflow.agent.trim()
      : "kody";
  for (const step of workflow.steps ?? []) delete step.agent;
  await writeFile(file, `${JSON.stringify(workflow, null, 2)}\n`);
}

async function optionalText(file) {
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}

async function copyDirectory(source, target) {
  try {
    await cp(source, target, { recursive: true });
  } catch {}
}

async function copyImplementationTools(source, target) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (
      entry.name === "definition.json" ||
      entry.name === "runtime.json" ||
      entry.name === "prompt.md" ||
      entry.name === "skills"
    ) {
      continue;
    }
    await cp(join(source, entry.name), join(target, entry.name), {
      recursive: true,
    });
  }
}

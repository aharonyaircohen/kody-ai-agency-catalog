import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

try {
  const input = JSON.parse(process.env.KODY_CAPABILITY_INPUT || "{}");
  const installation = input.installation;
  if (!installation || typeof installation !== "object" || Array.isArray(installation)) {
    throw new Error("installation is required");
  }

  const evidence = [];
  if (installation.configPatch !== undefined) {
    const current = readJson("kody.config.json", {});
    const merged = merge(current, installation.configPatch);
    writeFileSync("kody.config.json", `${JSON.stringify(merged, null, 2)}\n`);
    evidence.push("Merged installation.configPatch into kody.config.json");
  }

  for (const file of installation.files ?? []) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string") {
      throw new Error("installation.files entries require path and content");
    }
    const target = safeTarget(file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
    evidence.push(`Wrote ${file.path}`);
  }

  emit({
    status: "installed",
    summary: "Trusted Store installation bundle is present in the repository diff.",
    evidence,
  });
} catch (error) {
  emit({
    status: "blocked",
    summary: error instanceof Error ? error.message : String(error),
    evidence: [],
  });
}

function safeTarget(path) {
  const root = resolve(".");
  const target = resolve(root, path);
  if (target === root || (!target.startsWith(`${root}${sep}`))) {
    throw new Error(`Unsafe installation path: ${path}`);
  }
  const normalized = relative(root, target).split(sep).join("/");
  if (!normalized.startsWith(".kody-engine/definitions/loops/")) {
    throw new Error(`Unsafe installation path: ${path}`);
  }
  return target;
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

function merge(current, patch) {
  if (Array.isArray(patch)) {
    const existing = Array.isArray(current) ? current : [];
    return [...existing, ...patch.filter((value) => !existing.some((item) => JSON.stringify(item) === JSON.stringify(value)))];
  }
  if (patch && typeof patch === "object") {
    const base = current && typeof current === "object" && !Array.isArray(current) ? current : {};
    return Object.fromEntries(
      [...new Set([...Object.keys(base), ...Object.keys(patch)])].map((key) => [
        key,
        Object.hasOwn(patch, key) ? merge(base[key], patch[key]) : base[key],
      ]),
    );
  }
  return patch;
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

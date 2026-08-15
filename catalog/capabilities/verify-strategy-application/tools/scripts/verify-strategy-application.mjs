import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function verifyStrategyApplication({ blueprint, installation, files, checks, pr }) {
  const delivery = blueprint?.verification?.delivery || {};
  const requiredFiles = unique(delivery.requiredFiles);
  const requiredConfigPaths = unique(delivery.requiredConfigPaths);
  const requiredChecks = unique(delivery.requiredChecks);
  const failures = [];
  const evidence = [];

  for (const filePath of requiredFiles) {
    if (!files.has(filePath)) failures.push(`Missing required file ${filePath}`);
    else evidence.push(`Required file exists: ${filePath}`);
  }

  const configPatch = installation?.configPatch;
  const needsConfig = requiredConfigPaths.length > 0 || isObject(configPatch);
  let config;
  if (needsConfig) {
    try {
      config = JSON.parse(files.get("kody.config.json") || "");
    } catch {
      failures.push("Missing or invalid kody.config.json on the pull request head");
    }
  }
  if (config) {
    if (isObject(configPatch)) collectSubsetFailures(configPatch, config, "", failures);
    for (const dottedPath of requiredConfigPaths) {
      if (readPath(config, dottedPath) === undefined) failures.push(`Missing required config ${dottedPath}`);
      else evidence.push(`Required config exists: ${dottedPath}`);
    }
  }

  for (const requiredCheck of requiredChecks) {
    const match = checks.find((check) => String(check.name || "").toLowerCase() === requiredCheck.toLowerCase());
    if (!match || !["SUCCESS", "NEUTRAL", "SKIPPED"].includes(String(match.state || "").toUpperCase())) {
      failures.push(`Required check did not pass: ${requiredCheck}`);
    } else {
      evidence.push(`Required check passed: ${requiredCheck}`);
    }
  }

  if (failures.length > 0) {
    return { status: "blocked", summary: failures.join("; "), evidence };
  }
  const summary = `Blueprint delivery is verified on PR #${pr}.`;
  return {
    status: "verified",
    summary,
    evidence,
    agencyVerification: { passed: true, evidence: summary },
  };
}

function collectSubsetFailures(expected, actual, prefix, failures) {
  for (const [key, value] of Object.entries(expected)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const current = actual?.[key];
    if (Array.isArray(value)) {
      if (!Array.isArray(current)) failures.push(`Missing required config ${path}`);
      else for (const item of value) {
        if (!current.some((candidate) => JSON.stringify(candidate) === JSON.stringify(item))) {
          failures.push(`Missing required config value ${path}: ${String(item)}`);
        }
      }
    } else if (isObject(value)) {
      if (!isObject(current)) failures.push(`Missing required config ${path}`);
      else collectSubsetFailures(value, current, path, failures);
    } else if (current !== value) {
      failures.push(`Missing required config value ${path}: ${String(value)}`);
    }
  }
}

function readPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, segment) => current?.[segment], value);
}

function unique(value) {
  return Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === "string" && item.trim()))] : [];
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function runGh(args) {
  const result = spawnSync("gh", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error((result.stderr || "GitHub request failed").trim().slice(-1000));
  return result.stdout.trim();
}

function repositoryName() {
  let config = {};
  try { config = JSON.parse(readFileSync("kody.config.json", "utf8")); } catch {}
  const configured = `${config.github?.owner || ""}/${config.github?.repo || ""}`;
  const repository = configured !== "/" ? configured : process.env.GITHUB_REPOSITORY || "";
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("Repository identity is missing");
  return repository;
}

function remoteFile(repository, ref, filePath) {
  const endpoint = `repos/${repository}/contents/${filePath.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`;
  const raw = JSON.parse(runGh(["api", endpoint]));
  return Buffer.from(raw.content || "", "base64").toString("utf8");
}

function main() {
  try {
    const input = JSON.parse(process.env.KODY_CAPABILITY_INPUT || "{}");
    const repository = repositoryName();
    const prData = JSON.parse(runGh([
      "pr", "view", String(input.pr), "--repo", repository,
      "--json", "headRefOid,statusCheckRollup",
    ]));
    const delivery = input.blueprint?.verification?.delivery || {};
    const paths = new Set(unique(delivery.requiredFiles));
    if (unique(delivery.requiredConfigPaths).length > 0 || isObject(input.installation?.configPatch)) {
      paths.add("kody.config.json");
    }
    const files = new Map();
    for (const filePath of paths) {
      try { files.set(filePath, remoteFile(repository, prData.headRefOid, filePath)); } catch {}
    }
    const checks = (prData.statusCheckRollup || []).map((check) => ({
      name: check.name || check.context,
      state: check.conclusion || check.state || check.status,
    }));
    process.stdout.write(`${JSON.stringify(verifyStrategyApplication({ ...input, files, checks }))}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ status: "blocked", summary: error instanceof Error ? error.message : String(error), evidence: [] })}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

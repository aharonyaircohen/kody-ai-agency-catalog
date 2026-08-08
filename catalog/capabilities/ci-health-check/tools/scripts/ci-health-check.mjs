import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  pullRequestCiResult,
  repositoryCiResult,
} from "./ci-health-model.mjs";

try {
  const config = readConfig();
  const repository = repositoryName(config);
  const defaultBranch = stringValue(config.git?.defaultBranch) || "main";
  const pr = positiveInteger(process.env.KODY_ARG_PR);
  const result = pr
    ? inspectPullRequest(repository, pr)
    : inspectRepository(repository, defaultBranch);
  emit(result);
} catch (error) {
  process.stderr.write(`ci-health: ${message(error)}\n`);
  emit({
    status: "blocked",
    needsRepair: false,
    failedChecks: [],
    summary: `CI health could not read GitHub: ${message(error)}`,
  });
}

function inspectRepository(repository, defaultBranch) {
  const runs = ghJson([
    "api",
    `repos/${repository}/actions/runs?branch=${encodeURIComponent(defaultBranch)}&per_page=100`,
  ]).workflow_runs;
  return repositoryCiResult(Array.isArray(runs) ? runs : [], {
    currentRunId: String(process.env.GITHUB_RUN_ID || ""),
    defaultBranch,
  });
}

function inspectPullRequest(repository, pr) {
  const pull = ghJson(["api", `repos/${repository}/pulls/${pr}`]);
  const sha = stringValue(pull.head?.sha);
  if (!sha) throw new Error(`PR #${pr} has no readable head commit`);
  const runs = ghJson([
    "api",
    `repos/${repository}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=100`,
  ]).workflow_runs;
  return pullRequestCiResult(Array.isArray(runs) ? runs : [], pull, {
    currentRunId: String(process.env.GITHUB_RUN_ID || ""),
  });
}

function ghJson(args) {
  const output = gh(args);
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`GitHub returned invalid JSON for: gh ${args.join(" ")}`);
  }
}

function gh(args, input) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    input,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const detail = stringValue(result.stderr).slice(-500);
    throw new Error(detail || `gh ${args[0]} failed with exit ${result.status}`);
  }
  return result.stdout.trim();
}

function repositoryName(config) {
  const configured =
    stringValue(config.github?.owner) && stringValue(config.github?.repo)
      ? `${stringValue(config.github.owner)}/${stringValue(config.github.repo)}`
      : "";
  const repository = configured || stringValue(process.env.GITHUB_REPOSITORY);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("Repository identity is missing or invalid");
  }
  return repository;
}

function readConfig() {
  try {
    return JSON.parse(readFileSync("kody.config.json", "utf8"));
  } catch {
    return {};
  }
}

function positiveInteger(value) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

function emit(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(0);
}

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  exactRunCiResult,
  pullRequestCiResult,
  repositoryCiResult,
} from "./ci-health-model.mjs";
import { waitForCiCompletion } from "./ci-health-wait.mjs";

await main();

async function main() {
  try {
    const config = readConfig();
    const input = capabilityInput();
    const repository = repositoryName(config);
    const defaultBranch = stringValue(config.git?.defaultBranch) || "main";
    const pr = positiveInteger(input.pr) || positiveInteger(process.env.KODY_ARG_PR);
    const runId = positiveInteger(input.runId);
    const branch = stringValue(input.branch);
    const headSha = stringValue(input.headSha);
    const observe = runId && branch && headSha
      ? () => inspectExactRun(repository, { pr, runId, branch, headSha })
      : pr
      ? () => inspectPullRequest(repository, pr)
      : () => inspectRepository(repository, defaultBranch);
    const result = await waitForCiCompletion(observe, {
      waitForCompletion: Boolean(input.previousFailureFingerprint) || booleanValue(
        input.waitForCompletion ?? process.env.KODY_ARG_WAIT_FOR_COMPLETION,
      ),
      timeoutMs:
        boundedSeconds(
          input.timeoutSeconds ?? process.env.KODY_ARG_TIMEOUT_SECONDS,
          1800,
        ) * 1000,
      pollIntervalMs: positiveInteger(process.env.KODY_CI_POLL_INTERVAL_MS) || 10000,
    });
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
}

function inspectExactRun(repository, input) {
  const run = ghJson(["api", `repos/${repository}/actions/runs/${input.runId}`]);
  const result = exactRunCiResult(run, input);
  return result.status === "red"
    ? attachFailureEvidence(repository, result)
    : result;
}

function capabilityInput() {
  try {
    const parsed = JSON.parse(process.env.KODY_CAPABILITY_INPUT || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
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
  const result = {
    ...pullRequestCiResult(Array.isArray(runs) ? runs : [], pull, {
      currentRunId: String(process.env.GITHUB_RUN_ID || ""),
    }),
    headSha: sha,
  };
  return result.status === "red"
    ? attachFailureEvidence(repository, result)
    : result;
}

function attachFailureEvidence(repository, result) {
  const runId = positiveInteger(result.runId) || runIdFromUrl(result.runUrl);
  if (!runId) {
    return unreadableFailure(result, "the failed run ID is missing");
  }
  try {
    const rawLog = gh([
      "run",
      "view",
      String(runId),
      "--repo",
      repository,
      "--log-failed",
    ]);
    const failure = selectFailure(rawLog, result.failedChecks);
    if (!failure.log) {
      return unreadableFailure(result, "GitHub returned no failed job log");
    }
    const previous = stringValue(capabilityInput().previousFailureFingerprint);
    return {
      ...result,
      runId,
      failure,
      failureLog: failure.log,
      failureFingerprint: failure.fingerprint,
      repeatedFailure: Boolean(previous) && previous === failure.fingerprint,
    };
  } catch (error) {
    return unreadableFailure(result, message(error));
  }
}

function runIdFromUrl(value) {
  const match = stringValue(value).match(/\/actions\/runs\/(\d+)/);
  return match ? positiveInteger(match[1]) : null;
}

function selectFailure(raw, failedChecks = []) {
  const lines = String(raw || "").split("\n");
  let selected = null;
  for (let index = 0; index < lines.length; index += 1) {
    const score = failureScore(lines[index]);
    if (score > 0 && (!selected || score > selected.score)) selected = { index, score };
  }
  const anchor = selected?.index ?? Math.max(0, lines.length - 1);
  const check = checkName(lines[anchor]) || stringValue(failedChecks[0]) || "CI";
  const sameCheck = lines
    .slice(Math.max(0, anchor - 4), Math.min(lines.length, anchor + 7))
    .filter((line) => checkName(line) === check || !line.includes("\t"));
  const log = (sameCheck.length ? sameCheck : lines.slice(-20)).join("\n").trim().slice(0, 8000);
  const signature = normalizeFailure(lines[anchor] || log);
  return {
    check,
    log,
    fingerprint: createHash("sha256").update(`${check}\n${signature}`).digest("hex"),
  };
}

function failureScore(line) {
  if (/Module not found|Build Error|UnhandledSchemeError|error TS\d+|SyntaxError|ReferenceError|TypeError/i.test(line)) return 100;
  if (/##\[error\]Process completed with exit code/i.test(line)) return 5;
  if (/##\[error\]|AssertionError|Failed Tests/i.test(line)) return 90;
  if (/\bFAIL\b|Expected:|Received:/i.test(line)) return 80;
  if (/ERR_|ELIFECYCLE|Formatter would have printed|Some errors were emitted|Found \d+ errors|(?:^|\s)(?:Error|Fatal|Exception):|not configured|bad credentials|authentication failed|connection refused|ECONN|ETIMEDOUT|ENOTFOUND/i.test(line)) return 50;
  if (/Process completed with exit code/i.test(line)) return 10;
  return 0;
}

function checkName(line) {
  return line.includes("\t") ? stringValue(line.split("\t", 1)[0]) : "";
}

function normalizeFailure(line) {
  return String(line)
    .replace(/^.*?\t.*?\t/, "")
    .replace(/\d{4}-\d\d-\d\dT\S+/g, "<time>")
    .replace(/:\d+(?::\d+)?/g, ":<line>")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function unreadableFailure(result, reason) {
  const { failureLog: _failureLog, ...safeResult } = result;
  return {
    ...safeResult,
    status: "blocked",
    needsRepair: false,
    summary: `CI is red, but its failed logs could not be read: ${reason}`,
  };
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
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync("gh", args, {
      encoding: "utf8",
      input,
      maxBuffer: 4 * 1024 * 1024,
    });
    if (result.status === 0) {
      return result.stdout.trim();
    }

    const detail = stringValue(result.stderr).slice(-500);
    if (attempt === maxAttempts || !isRetryableGitHubError(detail)) {
      throw new Error(detail || `gh ${args[0]} failed with exit ${result.status}`);
    }

    const delayMs = githubRetryDelayMs(attempt);
    process.stderr.write(
      `ci-health: transient GitHub read failed; retrying (${attempt}/${maxAttempts}) in ${delayMs}ms\n`,
    );
    sleepSync(delayMs);
  }

  throw new Error(`gh ${args[0]} failed`);
}

function isRetryableGitHubError(detail) {
  return /x509|tls|certificate|connection reset|connection refused|temporary failure|timed? out|timeout|unexpected eof|econnreset|econnrefused|etimedout|enotfound|http (?:408|429|5\d\d)|status (?:408|429|5\d\d)|bad gateway|service unavailable|gateway timeout/i.test(
    detail,
  );
}

function githubRetryDelayMs(attempt) {
  const configured = positiveInteger(process.env.KODY_GITHUB_RETRY_DELAY_MS);
  return configured || (attempt === 1 ? 1000 : 3000);
}

function sleepSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
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

function boundedSeconds(value, fallback) {
  const parsed = positiveInteger(value) || fallback;
  return Math.min(parsed, 3600);
}

function booleanValue(value) {
  return String(value || "").toLowerCase() === "true";
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

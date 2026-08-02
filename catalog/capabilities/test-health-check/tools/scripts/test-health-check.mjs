import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "<!-- kody:test-health:v1 -->";
const repeat = boundedInteger(process.env.KODY_ARG_REPEAT, 2, 1, 3);
const slowTestMs = boundedInteger(process.env.KODY_ARG_SLOW_TEST_MS, 300_000, 1_000, 86_400_000);
const now = new Date().toISOString();
const config = readConfig();
const testCommand = stringValue(config.quality?.testUnit);
const coverageCommand = stringValue(config.quality?.coverage);

if (!testCommand) {
  emit({
    status: "blocked",
    needsRepair: false,
    summary: "Test health is blocked because quality.testUnit is not configured.",
    facts: {
      testRuns: 0,
      coverageConfigured: Boolean(coverageCommand),
      finding: finding("Test health cannot run", "quality.testUnit is not configured", "high", "open"),
    },
    blockers: ["quality.testUnit is not configured"],
  });
}

const testRuns = Array.from({ length: repeat }, () => runCommand("tests", testCommand));
const coverageRun = coverageCommand ? runCommand("coverage", coverageCommand) : null;
const passedRuns = testRuns.filter((run) => run.exitCode === 0).length;
const testsFailed = passedRuns === 0;
const testsFlaky = passedRuns > 0 && passedRuns < testRuns.length;
const coverageFailed = coverageRun !== null && coverageRun.exitCode !== 0;
const longestTestMs = Math.max(...testRuns.map((run) => run.durationMs));
const slowTests = longestTestMs > slowTestMs;
const disabledOrFocusedTests = countDisabledOrFocusedTests(process.cwd());
const repairable = testsFailed || testsFlaky || coverageFailed;
const concerns = [
  ...(!coverageCommand ? ["coverage command is not configured"] : []),
  ...(slowTests ? [`test run exceeded ${slowTestMs}ms`] : []),
  ...(disabledOrFocusedTests > 0
    ? [`found ${disabledOrFocusedTests} disabled or focused test marker(s)`]
    : []),
];
const failures = [
  ...(testsFailed ? ["tests failed"] : []),
  ...(testsFlaky ? ["test results changed between repeated runs"] : []),
  ...(coverageFailed ? ["coverage gate failed"] : []),
];
const summary = [...failures, ...concerns].join("; ") || "Tests and configured coverage are healthy.";
const facts = {
  testRuns: testRuns.length,
  passedTestRuns: passedRuns,
  coverageConfigured: Boolean(coverageCommand),
  coveragePassed: coverageRun?.exitCode === 0,
  longestTestMs,
  disabledOrFocusedTests,
};

if (repairable) {
  const issue = ensureRepairIssue(summary, [...testRuns, ...(coverageRun ? [coverageRun] : [])]);
  if (!issue) {
    emit({
      status: "blocked",
      needsRepair: false,
      summary: `${summary}; unable to create or reuse the repair issue.`,
      facts: { ...facts, finding: finding("Test health needs repair", summary, "high", "open") },
      blockers: ["Unable to create or reuse the Test Health repair issue"],
    });
  }
  emit({
    status: "red",
    needsRepair: true,
    issue,
    summary,
    facts: { ...facts, finding: finding("Test health needs repair", summary, "high", "open") },
    blockers: [],
  });
}

if (concerns.length > 0) {
  emit({
    status: "concern",
    needsRepair: false,
    summary,
    facts: { ...facts, finding: finding("Test health needs attention", summary, "medium", "open") },
    blockers: [],
  });
}

emit({
  status: "healthy",
  needsRepair: false,
  summary,
  facts: { ...facts, finding: finding("Test health is healthy", summary, "info", "resolved") },
  blockers: [],
});

function runCommand(label, command) {
  const startedAt = Date.now();
  const commandEnv = { ...process.env, CI: process.env.CI || "1" };
  const blockedNames = new Set([
    "GH_TOKEN",
    "GITHUB_TOKEN",
    "GITHUB_EVENT_NAME",
    "GITHUB_EVENT_PATH",
    "KODY_FORCE_ACTION",
    "KODY_RUN_REQUEST_JSON",
    "KODY_SERVICE_KEY",
    "KODY_TOKEN",
    "KODY_OUTPUT",
    "KODY_CAPABILITY_OUTPUT",
  ]);
  for (const name of Object.keys(commandEnv)) {
    if (blockedNames.has(name) || name.startsWith("KODY_ARG_") || name.startsWith("KODY_CFG_")) {
      delete commandEnv[name];
    }
  }
  process.stderr.write(`test-health: running ${label}\n`);
  const result = spawnSync(command, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: commandEnv,
    shell: true,
    maxBuffer: 2 * 1024 * 1024,
  });
  const durationMs = Date.now() - startedAt;
  const exitCode = typeof result.status === "number" ? result.status : 1;
  process.stderr.write(`test-health: ${label} exited ${exitCode} in ${durationMs}ms\n`);
  if (exitCode !== 0) {
    const diagnostic = redactCommandOutput(`${result.stdout || ""}\n${result.stderr || ""}`);
    if (diagnostic) {
      process.stderr.write(`test-health: ${label} failure output (tail):\n${diagnostic}\n`);
    }
  }
  return {
    label,
    exitCode,
    durationMs,
  };
}

function redactCommandOutput(output) {
  let diagnostic = output.trim().slice(-8_000);
  for (const [name, value] of Object.entries(process.env)) {
    if (!/(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|SERVICE_KEY|API_KEY)/i.test(name)) continue;
    if (typeof value !== "string" || value.length < 6) continue;
    diagnostic = diagnostic.split(value).join("***");
  }
  return diagnostic;
}

function ensureRepairIssue(summary, runs) {
  const list = spawnSync(
    "gh",
    [
      "issue",
      "list",
      "--state",
      "open",
      "--limit",
      "100",
      "--json",
      "number,body",
      "--jq",
      `.[] | select(.body | contains(\"${MARKER}\")) | .number`,
    ],
    { encoding: "utf8" },
  );
  const existing = Number.parseInt(list.stdout?.trim() || "", 10);
  if (Number.isInteger(existing) && existing > 0) return existing;

  const evidence = runs
    .filter((run) => run.exitCode !== 0)
    .map((run) => `- ${run.label}: exit ${run.exitCode}`)
    .join("\n");
  const body = `${MARKER}\n\nThe scheduled Test Health check found a repairable failure.\n\n${summary}\n\n${evidence}`;
  const created = spawnSync(
    "gh",
    ["issue", "create", "--title", "Test health is red", "--body", body],
    { encoding: "utf8" },
  );
  const match = created.stdout?.match(/\/issues\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function finding(title, actual, severity, status) {
  const repo = process.env.GITHUB_REPOSITORY || "local/repository";
  return {
    id: "finding-test-health",
    observerId: "test-health",
    subject: `test-health:${repo}`,
    title,
    expectation: "Repository tests stay reliable, covered, focused, and reasonably fast",
    actual,
    severity,
    status,
    observedAt: now,
  };
}

function countDisabledOrFocusedTests(root) {
  const ignored = new Set([".git", ".kody-engine", ".next", "build", "coverage", "dist", "node_modules"]);
  const testFile = /(?:^|[._-])(spec|test)\.[cm]?[jt]sx?$/;
  const marker = /\b(?:describe|it|test)\.(?:skip|only)\s*\(|\b(?:xdescribe|xit|xtest)\s*\(/g;
  let count = 0;
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && testFile.test(entry.name)) {
        const content = readFileSync(path, "utf8");
        count += content.match(marker)?.length || 0;
      }
    }
  };
  visit(root);
  return count;
}

function readConfig() {
  try {
    return JSON.parse(readFileSync("kody.config.json", "utf8"));
  } catch {
    return {};
  }
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function emit(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(0);
}

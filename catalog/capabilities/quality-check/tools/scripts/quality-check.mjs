import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const qualityRunId = clean(process.env.KODY_ARG_QUALITYRUNID);
const testId = clean(process.env.KODY_ARG_TESTID);
const targetUrl = clean(process.env.KODY_ARG_TARGETURL);
const sourceCommit = clean(process.env.KODY_ARG_SOURCECOMMIT);
const artifactUrl = githubRunUrl(process.env);

if (!/^[A-Za-z0-9_-]{1,200}$/.test(qualityRunId)) emit("blocked", "Quality Run ID is missing or invalid.", "", 0, 0);
if (!/^[A-Za-z0-9_-]{1,200}$/.test(testId)) emit("blocked", "Quality test ID is missing or invalid.", "", 0, 0);
if (!/^https?:\/\//i.test(targetUrl)) emit("blocked", "Quality target URL is missing or invalid.", "", 0, 0);
const dashboardUrl = clean(process.env.KODY_PUBLIC_DASHBOARD_URL ?? process.env.DASHBOARD_URL ?? process.env.KODY_DASHBOARD_URL ?? process.env.KODY_API_URL);
if (!dashboardUrl || normalizedUrl(targetUrl) !== normalizedUrl(dashboardUrl)) emit("blocked", "Quality target URL does not match the authenticated Dashboard.", "", 0, 0);
if (!/^[0-9a-f]{7,64}$/i.test(sourceCommit)) emit("blocked", "Quality source commit is missing or invalid.", "", 0, 0);

const runner = join(process.cwd(), "apps/dashboard/scripts/live-ui-gate/run.mjs");
if (!existsSync(runner)) emit("blocked", "This repository does not provide the Quality test runner.", "", 0, 0);

const child = spawnSync(process.execPath, [runner, "--test-id", testId, "--run-id", qualityRunId], {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, BASE_URL: targetUrl, KODY_LIVE_EXPECTED_BASE_URL: targetUrl, QUALITY_RUN_ID: qualityRunId, QUALITY_TEST_ID: testId },
});
if (child.stderr) process.stderr.write(child.stderr);
const marker = "KODY_QUALITY_RESULT=";
const resultLine = (child.stdout ?? "").split(/\r?\n/).findLast((line) => line.startsWith(marker));
const result = parseResult(resultLine?.slice(marker.length));
if (!result || result.testId !== testId) emit("fail", `Quality test ${testId} ended without valid evidence.`, "", 0, 1);
if (result.sourceCommit !== sourceCommit) emit("fail", `Quality test ${testId} ran against a different source commit.`, result.artifactPath, result.passed, Math.max(1, result.failed));
if (child.status !== 0 || result.failed > 0) emit("fail", `Quality test ${testId} failed.`, result.artifactPath, result.passed, Math.max(1, result.failed));
emit("pass", `Quality test ${testId} passed.`, result.artifactPath, result.passed, result.failed);

function clean(value) { return typeof value === "string" ? value.trim() : ""; }
function normalizedUrl(value) {
  try {
    const url = new URL(value);
    url.username = ""; url.password = ""; url.search = ""; url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch { return ""; }
}
function githubRunUrl(environment) {
  const server = clean(environment.GITHUB_SERVER_URL);
  const repository = clean(environment.GITHUB_REPOSITORY);
  const runId = clean(environment.GITHUB_RUN_ID);
  return server && repository && runId ? `${server}/${repository}/actions/runs/${runId}` : "";
}
function parseResult(value) {
  if (!value) return null;
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed : null; } catch { return null; }
}
function emit(status, summary, artifactPath, passed, failed) {
  process.stdout.write(`${JSON.stringify({
    version: 1,
    status,
    summary,
    evidence: { qualityTestPassed: status === "pass" },
    facts: { testId, artifactPath, artifactUrl, passed, failed, sourceCommit },
    artifacts: artifactPath ? [{ label: `Quality evidence for ${testId}`, path: artifactPath, ...(artifactUrl ? { url: artifactUrl } : {}) }] : [],
    missingEvidence: status === "pass" ? [] : ["qualityTestPassed"],
    blockers: status === "blocked" ? [summary] : [],
  })}\n`);
  process.exit(0);
}

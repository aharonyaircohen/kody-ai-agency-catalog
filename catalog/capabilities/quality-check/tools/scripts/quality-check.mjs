import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const qualityRunId = clean(process.env.KODY_ARG_QUALITYRUNID);
const journeyName = clean(process.env.KODY_ARG_JOURNEYNAME);
const steps = parseSteps(process.env.KODY_ARG_STEPS);
const targetUrl = clean(process.env.KODY_ARG_TARGETURL);
const sourceCommit = clean(process.env.KODY_ARG_SOURCECOMMIT);
const artifactUrl = githubRunUrl(process.env);

if (!/^[A-Za-z0-9_-]{1,200}$/.test(qualityRunId)) emit("blocked", "Quality Run ID is missing or invalid.", "", 0, 0);
if (!journeyName || journeyName.length > 160) emit("blocked", "Journey name is missing or invalid.", "", 0, 0);
if (!steps) emit("blocked", "Journey steps are missing or invalid.", "", 0, 0);
if (!/^https:\/\//i.test(targetUrl)) emit("blocked", "Quality target URL must use HTTPS.", "", 0, 0);
if (!/^[0-9a-f]{7,64}$/i.test(sourceCommit)) emit("blocked", "Quality source commit is missing or invalid.", "", 0, 0);

const runner = fileURLToPath(new URL("./browser-steps.mjs", import.meta.url));
const child = spawnSync(process.execPath, [runner], {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 4 * 1024 * 1024,
  env: {
    ...process.env,
    QUALITY_RUN_ID: qualityRunId,
    QUALITY_JOURNEY_NAME: journeyName,
    QUALITY_STEPS: JSON.stringify(steps),
    QUALITY_TARGET_URL: targetUrl,
    QUALITY_SOURCE_COMMIT: sourceCommit,
  },
});
if (child.stderr) process.stderr.write(child.stderr);
const marker = "KODY_QUALITY_RESULT=";
const resultLine = (child.stdout ?? "").split(/\r?\n/).findLast((line) => line.startsWith(marker));
const result = parseResult(resultLine?.slice(marker.length));
if (!result || result.journeyName !== journeyName) emit("fail", `Journey ${journeyName} ended without valid evidence.`, "", 0, 1);
if (result.sourceCommit !== sourceCommit) emit("fail", `Journey ${journeyName} ran against a different source commit.`, result.artifactPath, result.passed, Math.max(1, result.failed));
if (child.status !== 0 || result.failed > 0) emit("fail", `Journey ${journeyName} failed.`, result.artifactPath, result.passed, Math.max(1, result.failed));
emit("pass", `Journey ${journeyName} passed.`, result.artifactPath, result.passed, result.failed);

function clean(value) { return typeof value === "string" ? value.trim() : ""; }
function parseSteps(value) {
  try {
    const parsed = JSON.parse(value ?? "");
    return Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 200 ? parsed : null;
  } catch { return null; }
}
function githubRunUrl(environment) {
  const server = clean(environment.GITHUB_SERVER_URL) || "https://github.com";
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
    facts: { journeyName, artifactPath, artifactUrl, passed, failed, sourceCommit },
    artifacts: artifactPath ? [{ label: `Quality evidence for ${journeyName}`, path: artifactPath, ...(artifactUrl ? { url: artifactUrl } : {}) }] : [],
    missingEvidence: status === "pass" ? [] : ["qualityTestPassed"],
    blockers: status === "blocked" ? [summary] : [],
  })}\n`);
  process.exit(0);
}

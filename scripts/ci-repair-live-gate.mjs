import { runCiRepairRepeatabilityGate } from "./lib/ci-repair-live-gate.mjs";

const token = process.env.KODY_CI_REPAIR_GATE_TOKEN?.trim();
if (!token) throw new Error("KODY_CI_REPAIR_GATE_TOKEN is required");

const result = await runCiRepairRepeatabilityGate({
  dashboardUrl:
    process.env.KODY_CI_REPAIR_GATE_DASHBOARD_URL?.trim() ||
    "https://kody-dashboard-khaki.vercel.app",
  githubToken: token,
  owner: process.env.KODY_CI_REPAIR_GATE_OWNER?.trim() || "aharonyaircohen",
  repo: process.env.KODY_CI_REPAIR_GATE_REPO?.trim() || "Kody-Engine-Tester",
  sourcePath:
    process.env.KODY_CI_REPAIR_GATE_SOURCE?.trim() ||
    "src/utils/capitalize-words.ts",
  workflowFile:
    process.env.KODY_CI_REPAIR_GATE_WORKFLOW?.trim() || "test-ci.yml",
  pipelineId:
    process.env.KODY_CI_REPAIR_GATE_PIPELINE?.trim() || "ci-repair",
  cycles: 2,
  timeoutMs: Number(
    process.env.KODY_CI_REPAIR_GATE_TIMEOUT_MS || 45 * 60_000,
  ),
  pollMs: Number(process.env.KODY_CI_REPAIR_GATE_POLL_MS || 5_000),
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

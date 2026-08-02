import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, it } from "node:test";

const execFileAsync = promisify(execFile);
const storeRoot = new URL("../", import.meta.url).pathname;
const temporaryDirectories = [];
const now = "2026-08-02T15:36:09.535Z";

const findingReport = `# Agency pipeline has stale items

Agency pipeline has 1 stale item.

## About
- **Type:** finding
- **Version:** 1
- **Generated:** ${now}
- **Owner:** agency-observer
- **Capability:** observe-agency-flow

## Finding
- **ID:** finding-agency-flow
- **Status:** open
- **Severity:** medium
- **Observer:** agency-observer
- **Subject:** agency-flow:kody-engine
- **Expected:** Agency work keeps moving
- **Actual:** One item is stale
- **Observation ID:** obs-agency-flow
- **Observed:** ${now}
`;

async function fixture() {
  const workspace = await mkdtemp(join(tmpdir(), "kody-report-workspace-"));
  const stateRoot = await mkdtemp(join(tmpdir(), "kody-report-state-"));
  temporaryDirectories.push(workspace, stateRoot);
  await writeFile(
    join(workspace, "kody.config.json"),
    `${JSON.stringify({
      github: { owner: "example", repo: "project" },
      state: { repo: "example/kody-state", path: "project", branch: "main" },
      company: { activeCapabilities: [] },
    })}\n`,
  );
  const statePath = join(stateRoot, "project");
  await mkdir(join(statePath, "reports", "finding-agency-flow", "runs"), { recursive: true });
  await writeFile(join(statePath, "reports", "finding-agency-flow", "runs", "2026-08-02.md"), findingReport);
  return { workspace, stateRoot, statePath };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("single Markdown report contract", () => {
  it("loads a Finding directly from visible Markdown", async () => {
    const { workspace, stateRoot } = await fixture();
    await execFileAsync(
      "bash",
      [join(storeRoot, "catalog/capabilities/operate-findings/tools/scripts/load-agency-findings.sh")],
      { cwd: workspace, env: { ...process.env, KODY_STATE_ROOT: stateRoot } },
    );

    const loaded = JSON.parse(await readFile(join(workspace, ".kody-engine/agency-findings.json"), "utf8"));
    assert.deepEqual(loaded.findings, [
      {
        id: "finding-agency-flow",
        title: "Agency pipeline has stale items",
        status: "open",
        severity: "medium",
        observerId: "agency-observer",
        subject: "agency-flow:kody-engine",
        expectation: "Agency work keeps moving",
        actual: "One item is stale",
        observationId: "obs-agency-flow",
        observedAt: now,
        reportSlug: "finding-agency-flow",
        reportRunId: "2026-08-02",
      },
    ]);
  });

  it("lets Agency Supervisor inspect the same visible Markdown", async () => {
    const { workspace, stateRoot, statePath } = await fixture();
    await mkdir(join(statePath, "agency", "observations"), { recursive: true });
    await mkdir(join(statePath, "runs"), { recursive: true });
    await mkdir(join(statePath, "operations"), { recursive: true });
    await writeFile(
      join(statePath, "agency", "observations", "obs-agency-flow.json"),
      `${JSON.stringify({ id: "obs-agency-flow", observedAt: now })}\n`,
    );
    await writeFile(
      join(statePath, "runs", "index.json"),
      `${JSON.stringify({
        runs: [
          { subjectId: "agency-observer", status: "success", updatedAt: now },
          { subjectId: "agency-operating-loop", status: "success", updatedAt: now },
        ],
      })}\n`,
    );

    const { stdout } = await execFileAsync(
      "bash",
      [join(storeRoot, "warehouse/capabilities/agency-supervisor/tools/scripts/run-agency-supervisor.sh")],
      {
        cwd: workspace,
        env: { ...process.env, KODY_STATE_ROOT: stateRoot, KODY_SUPERVISOR_NOW: now },
      },
    );
    const result = JSON.parse(
      stdout.split("\n").find((line) => line.startsWith("KODY_CAPABILITY_RESULT=")).slice("KODY_CAPABILITY_RESULT=".length),
    );
    assert.ok(result.facts.supervision.violations.some((violation) => violation.code === "idle-finding"));
  });
});

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, it } from "node:test";

const execFileAsync = promisify(execFile);
const storeRoot = new URL("../", import.meta.url).pathname;
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function runObserver(script, environment) {
  const workspace = await mkdtemp(join(tmpdir(), "kody-observer-"));
  const stateRoot = await mkdtemp(join(tmpdir(), "kody-observer-state-"));
  temporaryDirectories.push(workspace, stateRoot);
  await writeFile(
    join(workspace, "kody.config.json"),
    `${JSON.stringify({
      github: { owner: "example", repo: "project" },
      git: { defaultBranch: "main" },
      state: { repo: "example/kody-state", path: "project", branch: "main" },
    })}\n`,
  );

  const { stdout } = await execFileAsync(
    "bash",
    [join(storeRoot, "catalog", "capabilities", script, "tools", "scripts", `run-${script}.sh`)],
    {
      cwd: workspace,
      env: { ...process.env, KODY_STATE_ROOT: stateRoot, ...environment },
    },
  );
  const resultLine = stdout
    .split("\n")
    .find((line) => line.startsWith("KODY_CAPABILITY_RESULT="));
  assert.ok(resultLine, `${script} must emit a capability result`);
  return JSON.parse(resultLine.slice("KODY_CAPABILITY_RESULT=".length));
}

describe("Observer capability result semantics", () => {
  it("publishes one workflow summary while keeping step findings separate", async () => {
    const workflow = JSON.parse(
      await readFile(join(storeRoot, "catalog", "workflows", "agency-observer", "workflow.json"), "utf8"),
    );

    assert.deepEqual(workflow.report, {
      type: "agency-observer",
      version: 1,
      owner: "agency-observer",
      slug: "agency-observer",
      title: "Agency Observer",
    });
    assert.equal(workflow.steps[1].report.type, "finding");
    assert.equal(workflow.steps[2].report.type, "finding");
  });

  it("runs both deterministic observers through the script executor", async () => {
    for (const slug of ["observe-repo-ci", "observe-agency-flow"]) {
      const capabilityRoot = join(storeRoot, "catalog", "capabilities", slug);
      const contract = JSON.parse(
        await readFile(join(capabilityRoot, "contract.json"), "utf8"),
      );
      const entrypoint = await readFile(
        join(capabilityRoot, "tools", "run.sh"),
        "utf8",
      );

      assert.equal(contract.execution, "script");
      assert.deepEqual(contract.output.required, [
        "version",
        "status",
        "summary",
        "facts",
        "artifacts",
        "missingEvidence",
        "blockers",
      ]);
      assert.match(entrypoint, new RegExp(`run-${slug}\\.sh`));
    }
  });

  it("reports stale agency work as an open finding without failing execution", async () => {
    const result = await runObserver("observe-agency-flow", {
      KODY_AGENCY_FLOW_NOW: "2026-08-02T10:00:00.000Z",
      KODY_AGENCY_FLOW_ITEMS_JSON: JSON.stringify([
        { kind: "idle-finding", label: "Finding has not moved" },
      ]),
    });

    assert.equal(result.status, "pass");
    assert.equal(result.facts.observation.status, "unhealthy");
    assert.equal(result.facts.finding.status, "open");
    assert.deepEqual(result.blockers, []);
  });

  it("reports red repository CI as an open finding without failing execution", async () => {
    const result = await runObserver("observe-repo-ci", {
      KODY_OBSERVER_NOW: "2026-08-02T10:00:00.000Z",
      KODY_OBSERVER_CI_STATUS: "unhealthy",
    });

    assert.equal(result.status, "pass");
    assert.equal(result.facts.observation.status, "unhealthy");
    assert.equal(result.facts.finding.status, "open");
    assert.deepEqual(result.blockers, []);
  });

  it("attributes Director CI evidence to the Director without introducing an Observer Agent", async () => {
    const result = await runObserver("observe-repo-ci", {
      KODY_OBSERVER_NOW: "2026-08-02T10:00:00.000Z",
      KODY_OBSERVER_CI_STATUS: "unhealthy",
      KODY_CAPABILITY_INPUT: JSON.stringify({ owner: "director" }),
    });

    assert.equal(result.facts.repoCI.status, "unhealthy");
    assert.equal(result.facts.repoCI.branch, "main");
    assert.equal(result.facts.observation, undefined);
    assert.equal(result.facts.finding, undefined);
  });

  it("defines the Director CI workflow as one check that publishes one stable Report", async () => {
    const workflow = JSON.parse(
      await readFile(join(storeRoot, "catalog", "workflows", "director-ci-monitor", "workflow.json"), "utf8"),
    );

    assert.equal(workflow.steps.length, 1);
    assert.equal(workflow.steps[0].capability, "observe-repo-ci");
    assert.equal(workflow.steps[0].input.owner, "director");
    assert.equal(workflow.steps[0].report.slug, "director-repo-ci");
    assert.equal(workflow.steps[0].report.owner, "director");
  });
});

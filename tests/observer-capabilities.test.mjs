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
});

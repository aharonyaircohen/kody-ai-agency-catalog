import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import { describe, it } from "node:test";

const execFileAsync = promisify(execFile);
const script = new URL(
  "../catalog/capabilities/release-validate/tools/scripts/release-validate.sh",
  import.meta.url,
).pathname;

async function runValidate(runListJson) {
  const root = await mkdtemp(join(tmpdir(), "release-validate-"));
  const bin = join(root, "bin");
  const log = join(root, "gh.log");
  await mkdir(bin);
  await writeFile(
    join(bin, "gh"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$GH_TEST_LOG"
case "$1 $2" in
  "pr view")
    printf '%s\\n' '{"state":"OPEN","headRefName":"release/v0.30.3","headRefOid":"abc123"}'
    ;;
  "run list")
    printf '%s\\n' '${runListJson}'
    ;;
  "workflow run")
    ;;
  *)
    exit 2
    ;;
esac
`,
    { mode: 0o755 },
  );

  const result = await execFileAsync("bash", [script], {
    env: {
      ...process.env,
      PATH: `${bin}${delimiter}${process.env.PATH}`,
      GH_TEST_LOG: log,
      KODY_ARG_PR: "993",
      KODY_CFG_RELEASE_VALIDATION_WORKFLOW: "ci.yml",
      KODY_CFG_RELEASE_VALIDATION_INPUTS_RELEASE_GATE: "true",
    },
  });
  return {
    ...result,
    calls: await readFile(log, "utf8"),
  };
}

function resultMarker(stdout) {
  const line = stdout
    .split("\n")
    .find((candidate) => candidate.startsWith("KODY_CAPABILITY_RESULT="));
  assert.ok(line);
  return JSON.parse(line.slice("KODY_CAPABILITY_RESULT=".length));
}

describe("release-validate", () => {
  it("dispatches the configured workflow for the prepared release head", async () => {
    const result = await runValidate("[]");

    assert.match(
      result.calls,
      /workflow run ci\.yml --ref release\/v0\.30\.3 -f release_gate=true/,
    );
    assert.deepEqual(resultMarker(result.stdout), {
      version: 1,
      status: "changed",
      summary: "Dispatched ci.yml for release PR #993",
      evidence: { releaseValidationRequested: true },
      facts: {
        validationPr: 993,
        validationWorkflow: "ci.yml",
        validationHeadSha: "abc123",
        validationDispatched: true,
      },
    });
  });

  it("reuses an existing successful validation for the same commit", async () => {
    const result = await runValidate(
      '[{"status":"completed","conclusion":"success"}]',
    );

    assert.doesNotMatch(result.calls, /workflow run/);
    assert.equal(resultMarker(result.stdout).status, "noop");
    assert.equal(resultMarker(result.stdout).facts.validationDispatched, false);
  });
});

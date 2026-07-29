import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import { describe, it } from "node:test";

const execFileAsync = promisify(execFile);
const script = new URL(
  "../catalog/capabilities/release-deploy/tools/scripts/release-deploy.sh",
  import.meta.url,
).pathname;

async function runDeploy(conclusion = "success") {
  const root = await mkdtemp(join(tmpdir(), "release-deploy-"));
  const bin = join(root, "bin");
  const log = join(root, "commands.log");
  await mkdir(bin);
  await writeFile(
    join(bin, "git"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "git $*" >> "$COMMAND_LOG"
if [[ "$1 $2" == "rev-parse origin/main" ]]; then printf '%s\\n' abc123; else exit 2; fi
`,
    { mode: 0o755 },
  );
  await writeFile(
    join(bin, "curl"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "curl $*" >> "$COMMAND_LOG"
`,
    { mode: 0o755 },
  );
  await writeFile(
    join(bin, "gh"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "gh $*" >> "$COMMAND_LOG"
case "$1 $2" in
  "run list")
    if grep -q '^gh workflow run' "$COMMAND_LOG"; then
      printf '%s\\n' '[{"databaseId":67890,"url":"https://github.com/acme/web/actions/runs/67890"}]'
    else
      printf '%s\\n' '[]'
    fi
    ;;
  "run view")
    printf '%s\\n' '{"status":"completed","conclusion":"${conclusion}","url":"https://github.com/acme/web/actions/runs/67890"}'
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
    cwd: root,
    env: {
      ...process.env,
      PATH: `${bin}${delimiter}${process.env.PATH}`,
      COMMAND_LOG: log,
      KODY_CFG_GIT_DEFAULTBRANCH: "dev",
      KODY_CFG_RELEASE_RELEASEBRANCH: "main",
      KODY_CFG_RELEASE_DEPLOYMENT_WORKFLOW: "deploy.yml",
      KODY_CFG_RELEASE_DEPLOYMENT_INPUTS_ENVIRONMENT: "production",
      KODY_CFG_RELEASE_PRODUCTIONURL: "https://example.com",
      KODY_CFG_RELEASE_TIMEOUTMS: "60000",
    },
  });
  return { ...result, calls: await readFile(log, "utf8") };
}

function resultMarker(stdout) {
  const line = stdout
    .split("\n")
    .find((candidate) => candidate.startsWith("KODY_CAPABILITY_RESULT="));
  assert.ok(line);
  return JSON.parse(line.slice("KODY_CAPABILITY_RESULT=".length));
}

describe("release-deploy", () => {
  it("dispatches and verifies the configured provider-neutral deployment", async () => {
    const result = await runDeploy();

    assert.match(result.calls, /gh workflow run deploy\.yml --ref main -f environment=production/);
    assert.match(result.calls, /curl .*https:\/\/example\.com/);
    assert.deepEqual(resultMarker(result.stdout), {
      version: 1,
      status: "pass",
      summary: "deploy.yml deployed main",
      evidence: { productionDeployed: true },
      facts: {
        deploymentWorkflow: "deploy.yml",
        deploymentBranch: "main",
        deploymentHeadSha: "abc123",
        deploymentRun: 67890,
        deploymentRunUrl: "https://github.com/acme/web/actions/runs/67890",
        deploymentConclusion: "success",
        productionUrl: "https://example.com",
      },
      artifacts: [
        {
          label: "Deployment workflow",
          url: "https://github.com/acme/web/actions/runs/67890",
        },
        { label: "Production", url: "https://example.com" },
      ],
      missingEvidence: [],
      blockers: [],
    });
  });

  it("fails when the exact deployment run fails", async () => {
    await assert.rejects(runDeploy("failure"), (error) => {
      assert.match(error.stdout, /KODY_REASON=.*completed with failure/);
      return true;
    });
  });
});

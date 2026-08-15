import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const runner = new URL(
  "../catalog/capabilities/prepare-strategy-application/tools/run.sh",
  import.meta.url,
).pathname;

async function fixture({ linkedPr = null, branchPr = null } = {}) {
  const root = await mkdtemp(join(tmpdir(), "kody-strategy-prepare-"));
  const bodyFile = join(root, "issue-body.md");
  const gh = join(root, "gh");
  await writeFile(
    gh,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1 $2" == "api search/issues"* ]]; then
  printf '{"items":[]}'
elif [[ "$1 $2" == "api graphql" ]]; then
  printf '${linkedPr ? `{"data":{"repository":{"pullRequests":{"nodes":[{"number":${linkedPr},"headRefName":"feature","closingIssuesReferences":{"nodes":[{"number":42}]}}]}}}}` : branchPr ? `{"data":{"repository":{"pullRequests":{"nodes":[{"number":${branchPr},"headRefName":"42-apply-web-release-strategy","closingIssuesReferences":{"nodes":[]}}]}}}}` : '{"data":{"repository":{"pullRequests":{"nodes":[]}}}}'}'
elif [[ "$1 $2" == "issue create" ]]; then
  cat > "${bodyFile}"
  printf 'https://github.com/acme/widget/issues/42\n'
else
  printf 'unexpected gh call: %s\n' "$*" >&2
  exit 1
fi
`,
  );
  await chmod(gh, 0o755);
  return { root, bodyFile };
}

function run(root, input) {
  const result = spawnSync(runner, [], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${root}:${process.env.PATH}`,
      GITHUB_REPOSITORY: "acme/widget",
      KODY_CAPABILITY_INPUT: JSON.stringify(input),
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

describe("prepare-strategy-application", () => {
  it("creates one stable delivery issue from the approved request", async () => {
    const setup = await fixture();
    await writeFile(
      join(setup.root, "kody.config.json"),
      JSON.stringify({ activeWorkflows: ["existing"], model: "keep-me" }),
    );
    const output = run(setup.root, {
      blueprintId: "healthy-ci",
      blueprintVersion: "1.0.0",
      requestId: "request-123",
      outcome: "Build repository-native CI",
      installation: {
        configPatch: { activeWorkflows: ["existing", "ci-repair"] },
        files: [
          {
            path: ".kody-engine/definitions/loops/ci-repair/loop.json",
            content: "{\n}\n",
          },
        ],
      },
    });

    assert.deepEqual(output, {
      status: "ready",
      issue: 42,
      hasOpenPr: false,
      summary: "Strategy application issue #42 is ready.",
    });
    const body = await readFile(setup.bodyFile, "utf8");
    assert.match(body, /kody:strategy-application:v1/);
    assert.match(body, /Request: `request-123`/);
    assert.match(body, /healthy-ci@1\.0\.0/);
    assert.deepEqual(
      JSON.parse(await readFile(join(setup.root, "kody.config.json"), "utf8")),
      { activeWorkflows: ["existing", "ci-repair"], model: "keep-me" },
    );
    assert.equal(
      await readFile(
        join(
          setup.root,
          ".kody-engine/definitions/loops/ci-repair/loop.json",
        ),
        "utf8",
      ),
      "{\n}\n",
    );
  });

  it("resumes from an existing linked pull request", async () => {
    const setup = await fixture({ linkedPr: 53 });
    const output = run(setup.root, {
      blueprintId: "web-release",
      blueprintVersion: "1.0.3",
      requestId: "request-resume",
      outcome: "Build web release",
      issue: 42,
    });

    assert.deepEqual(output, {
      status: "ready",
      issue: 42,
      pr: 53,
      hasOpenPr: true,
      summary: "Strategy application issue #42 resumes on PR #53.",
    });
  });

  it("resumes from Kody's issue branch when GitHub omits the issue link", async () => {
    const setup = await fixture({ branchPr: 53 });
    const output = run(setup.root, {
      blueprintId: "web-release",
      blueprintVersion: "1.0.3",
      requestId: "request-resume",
      outcome: "Build web release",
      issue: 42,
    });

    assert.equal(output.pr, 53);
    assert.equal(output.hasOpenPr, true);
  });

  it("returns a clear blocker when the request identity is missing", async () => {
    const setup = await fixture();
    const output = run(setup.root, {
      blueprintId: "healthy-ci",
      blueprintVersion: "1.0.0",
      outcome: "Build repository-native CI",
      installation: { files: [] },
    });

    assert.equal(output.status, "blocked");
    assert.equal(output.hasOpenPr, false);
    assert.match(output.summary, /requestId is required/);
  });

  it("blocks installation paths outside the repository", async () => {
    const setup = await fixture();
    const output = run(setup.root, {
      blueprintId: "healthy-ci",
      blueprintVersion: "1.0.0",
      requestId: "request-unsafe",
      outcome: "Build repository-native CI",
      installation: {
        files: [{ path: "../outside.json", content: "{}" }],
      },
    });

    assert.equal(output.status, "blocked");
    assert.equal(output.hasOpenPr, false);
    assert.match(output.summary, /unsafe installation path/i);
  });
});

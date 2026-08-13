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

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "kody-strategy-prepare-"));
  const bodyFile = join(root, "issue-body.md");
  const gh = join(root, "gh");
  await writeFile(
    gh,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1 $2" == "api search/issues"* ]]; then
  printf '{"items":[]}'
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
    const output = run(setup.root, {
      blueprintId: "healthy-ci",
      blueprintVersion: "1.0.0",
      requestId: "request-123",
      outcome: "Build repository-native CI",
    });

    assert.deepEqual(output, {
      status: "ready",
      issue: 42,
      summary: "Strategy application issue #42 is ready.",
    });
    const body = await readFile(setup.bodyFile, "utf8");
    assert.match(body, /kody:strategy-application:v1/);
    assert.match(body, /Request: `request-123`/);
    assert.match(body, /healthy-ci@1\.0\.0/);
  });

  it("returns a clear blocker when the request identity is missing", async () => {
    const setup = await fixture();
    const output = run(setup.root, {
      blueprintId: "healthy-ci",
      blueprintVersion: "1.0.0",
      outcome: "Build repository-native CI",
    });

    assert.equal(output.status, "blocked");
    assert.match(output.summary, /requestId is required/);
  });
});

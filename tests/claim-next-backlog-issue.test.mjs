import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const script = new URL(
  "../catalog/capabilities/claim-next-backlog-issue/tools/run.sh",
  import.meta.url,
).pathname;

async function runSelector(labels) {
  const dir = await mkdtemp(join(tmpdir(), "kody-claim-test-"));
  const calls = join(dir, "calls.log");
  const gh = join(dir, "gh");
  await writeFile(
    gh,
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >>"$FAKE_GH_CALLS"
case "$*" in
  "api user --jq .login") printf '%s\\n' kody-bot ;;
  "run list"*) printf '%s\\n' '[]' ;;
  *"graphql"*) printf '%s\\n' '0' ;;
  *"issues?state=open"*) printf '%s\\n' '[[{"number":127,"title":"Marker leak","labels":${JSON.stringify(labels)},"pull_request":null}]]' ;;
  *"--method PATCH"*) printf '%s\\n' '{}' ;;
  *"--method POST"*) printf '%s\\n' '{}' ;;
  *"issues/127/comments"*"--jq"*) ;;
  *"issues/127/comments"*) printf '%s\\n' '[]' ;;
  *"issues/127") printf '%s\\n' '{"number":127,"title":"Marker leak","labels":${JSON.stringify(labels)},"pull_request":null}' ;;
  *) printf 'unexpected gh call: %s\\n' "$*" >&2; exit 2 ;;
esac
`,
  );
  await chmod(gh, 0o755);
  const result = spawnSync("bash", [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
      FAKE_GH_CALLS: calls,
      GITHUB_REPOSITORY: "aharonyaircohen/kody-chat",
      KODY_ARG_REQUIRED_LABELS: '["bug"]',
    },
  });
  return { result, calls: await readFile(calls, "utf8") };
}

describe("claim-next-backlog-issue script", () => {
  it("claims the lowest issue carrying the backlog and required labels", async () => {
    const { result, calls } = await runSelector([
      { name: "bug" },
      { name: "kody:backlog" },
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      status: "claimed",
      issue: 127,
      summary: "Claimed issue #127 and started preparing its pull request.",
    });
    assert.match(calls, /--method POST repos\/aharonyaircohen\/kody-chat\/issues\/127\/comments/);
  });

  it("does not claim an issue carrying an active Kody lifecycle label", async () => {
    const { result, calls } = await runSelector([
      { name: "bug" },
      { name: "kody:backlog" },
      { name: "kody:running" },
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, "none");
    assert.doesNotMatch(calls, /--method POST/);
  });
});

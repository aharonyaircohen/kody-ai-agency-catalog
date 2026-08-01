import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import { describe, it } from "node:test";

const execFileAsync = promisify(execFile);
const runner = new URL(
  "../catalog/capabilities/npm-publish/tools/run.sh",
  import.meta.url,
).pathname;

async function packageRoot() {
  const root = await mkdtemp(join(tmpdir(), "npm-publish-"));
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({ name: "@acme/widget", version: "1.2.3" })}\n`,
  );
  return root;
}

describe("npm-publish", () => {
  it("reports a dry run without an npm token", async () => {
    const root = await packageRoot();
    const { stdout } = await execFileAsync("bash", [runner], {
      cwd: root,
      env: { ...process.env, KODY_ARG_DRY_RUN: "true", NPM_TOKEN: "" },
    });

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, "pass");
    assert.equal(result.summary, "Would publish @acme/widget@1.2.3 to npm with tag latest.");
    assert.deepEqual(result.evidence, { packagePublishDryRun: true });
    assert.equal(result.facts.packageVersion, "1.2.3");
  });

  it("publishes an unpublished package and reports durable evidence", async () => {
    const root = await packageRoot();
    const bin = join(root, "bin");
    const log = join(root, "npm.log");
    await mkdir(bin);
    const npm = join(bin, "npm");
    await writeFile(
      npm,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$NPM_TEST_LOG"
if [[ "$1" == "view" ]]; then exit 1; fi
if [[ "$1" == "publish" ]]; then exit 0; fi
exit 2
`,
    );
    await chmod(npm, 0o755);

    const { stdout } = await execFileAsync("bash", [runner], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${bin}${delimiter}${process.env.PATH}`,
        NPM_TEST_LOG: log,
        NPM_TOKEN: "test-token",
      },
    });

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, "pass");
    assert.deepEqual(result.evidence, { packagePublished: true });
    assert.equal(result.facts.packageName, "@acme/widget");
    assert.equal(result.facts.packageVersion, "1.2.3");
    assert.match(await readFile(log, "utf8"), /publish --access public --tag latest/);
  });
});

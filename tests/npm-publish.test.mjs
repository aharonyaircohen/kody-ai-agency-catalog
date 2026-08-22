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

  it("reports the authentication needed for a real publish", async () => {
    const root = await packageRoot();
    const { stdout } = await execFileAsync("bash", [runner], {
      cwd: root,
      env: { ...process.env, NPM_TOKEN: "" },
    });

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, "fail");
    assert.match(result.summary, /publish authentication/i);
  });

  it("falls back to NPM_TOKEN before trusted publishing is configured", async () => {
    const root = await packageRoot();
    const bin = join(root, "bin");
    const log = join(root, "npm.log");
    await mkdir(bin);
    const npm = join(bin, "npm");
    await writeFile(
      npm,
      `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "view" ]]; then exit 1; fi
exit 2
`,
    );
    await chmod(npm, 0o755);
    const npx = join(bin, "npx");
    await writeFile(
      npx,
      `#!/usr/bin/env bash
set -euo pipefail
grep -q '//registry.npmjs.org/:_authToken=test-token' "$NPM_CONFIG_USERCONFIG"
printf '%s\\n' "$*" >> "$NPM_TEST_LOG"
if [[ "$1" == "--yes" && "$2" == "npm@11.19.0" && "$3" == "publish" ]]; then exit 0; fi
exit 2
`,
    );
    await chmod(npx, 0o755);

    const { stdout } = await execFileAsync("bash", [runner], {
      cwd: root,
      env: {
        ...process.env,
        ACTIONS_ID_TOKEN_REQUEST_URL: "",
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: "",
        NPM_TOKEN: "test-token",
        PATH: `${bin}${delimiter}${process.env.PATH}`,
        NPM_TEST_LOG: log,
      },
    });

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, "pass");
    assert.deepEqual(result.evidence, { packagePublished: true });
    assert.match(
      await readFile(log, "utf8"),
      /--yes npm@11\.19\.0 publish --access public --tag latest --registry https:\/\/registry\.npmjs\.org\/ --loglevel verbose/,
    );
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
    const npx = join(bin, "npx");
    await writeFile(
      npx,
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$NPM_TEST_LOG"
if [[ "$1" == "--yes" && "$2" == "npm@11.19.0" && "$3" == "publish" ]]; then exit 0; fi
exit 2
`,
    );
    await chmod(npx, 0o755);

    const oidcPayload = Buffer.from(
      JSON.stringify({
        aud: "npm:registry.npmjs.org",
        repository: "acme/widget",
        job_workflow_ref: "acme/widget/.github/workflows/kody.yml@refs/heads/main",
        ref: "refs/heads/main",
        repository_visibility: "public",
      }),
    ).toString("base64url");
    const oidcToken = `header.${oidcPayload}.signature`;
    const { stdout, stderr } = await execFileAsync("bash", [runner], {
      cwd: root,
      env: {
        ...process.env,
        ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.actions.example/id",
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
        NPM_ID_TOKEN: oidcToken,
        PATH: `${bin}${delimiter}${process.env.PATH}`,
        NPM_TEST_LOG: log,
      },
    });

    const result = JSON.parse(stdout.trim());
    assert.equal(result.status, "pass");
    assert.deepEqual(result.evidence, { packagePublished: true });
    assert.equal(result.facts.packageName, "@acme/widget");
    assert.equal(result.facts.packageVersion, "1.2.3");
    assert.match(stderr, /OIDC identity/);
    assert.match(stderr, /acme\/widget\/\.github\/workflows\/kody\.yml/);
    assert.doesNotMatch(stderr, new RegExp(oidcToken.replaceAll(".", "\\.")));
    assert.match(
      await readFile(log, "utf8"),
      /--yes npm@11\.19\.0 publish --access public --tag latest --registry https:\/\/registry\.npmjs\.org\/ --loglevel verbose/,
    );
  });
});

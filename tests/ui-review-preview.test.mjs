import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const resolver = resolve(
  new URL(
    "../catalog/capabilities/ui-review/tools/scripts/resolve-preview.sh",
    import.meta.url,
  ).pathname,
);

async function fixture() {
  const cwd = await mkdtemp(join(tmpdir(), "kody-ui-review-preview-"));
  const bin = join(cwd, "bin");
  await mkdir(bin);
  const gh = join(bin, "gh");
  await writeFile(
    gh,
    `#!/usr/bin/env node
const command = process.argv.slice(2).join(" ");
if (command === "pr view 17 --repo acme/widget --json headRefOid --jq .headRefOid") {
  process.stdout.write("head-abc\\n");
} else if (command === "api repos/acme/widget/deployments?ref=head-abc&per_page=20 --jq .[].id") {
  process.stdout.write("22\\n21\\n");
} else if (command === "api repos/acme/widget/deployments/22/statuses?per_page=20 --jq [.[] | select(.state == \\\"success\\\") | (.environment_url // .target_url) | select(type == \\\"string\\\" and length > 0)][0] // empty") {
  process.stdout.write("\\n");
} else if (command === "api repos/acme/widget/deployments/21/statuses?per_page=20 --jq [.[] | select(.state == \\\"success\\\") | (.environment_url // .target_url) | select(type == \\\"string\\\" and length > 0)][0] // empty") {
  process.stdout.write("https://preview.example.test/pr-17\\n");
} else {
  process.stderr.write("unexpected gh command: " + command + "\\n");
  process.exit(2);
}
`,
  );
  await chmod(gh, 0o755);
  return { cwd, bin };
}

function run({ cwd, bin }, args) {
  return spawnSync("bash", [resolver, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      GITHUB_REPOSITORY: "acme/widget",
    },
  });
}

describe("ui-review preview resolver", () => {
  it("uses a supplied HTTP preview URL without querying GitHub", async () => {
    const setup = await fixture();

    const result = run(setup, ["17", "https://direct.example.test/pr-17"]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "https://direct.example.test/pr-17");
  });

  it("finds a successful deployment for the exact PR head commit", async () => {
    const setup = await fixture();

    const result = run(setup, ["17"]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "https://preview.example.test/pr-17");
  });

  it("rejects a supplied non-HTTP URL", async () => {
    const setup = await fixture();

    const result = run(setup, ["17", "file:///tmp/not-a-preview"]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must use http or https/i);
  });
});

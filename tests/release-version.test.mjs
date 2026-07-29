import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, it } from "node:test";

const execFileAsync = promisify(execFile);
const script = new URL(
  "../catalog/capabilities/release-prepare/tools/scripts/release-version.sh",
  import.meta.url,
).pathname;

async function runVersion(root, operation, value, env = {}) {
  const command = [
    `source "${script}"`,
    operation === "read"
      ? "release_version_read ."
      : `release_version_write . "${value}"`,
  ].join("; ");
  return execFileAsync("bash", ["-c", command], {
    cwd: root,
    env: { ...process.env, ...env },
  });
}

describe("release version adapter", () => {
  it("keeps package.json as the backward-compatible default", async () => {
    const root = await mkdtemp(join(tmpdir(), "release-version-package-"));
    await writeFile(join(root, "package.json"), '{"version":"1.2.3"}\n');

    assert.equal((await runVersion(root, "read")).stdout.trim(), "1.2.3");
    await runVersion(root, "write", "1.2.4");

    assert.equal(JSON.parse(await readFile(join(root, "package.json"), "utf8")).version, "1.2.4");
  });

  it("supports repository-owned version commands and files", async () => {
    const root = await mkdtemp(join(tmpdir(), "release-version-command-"));
    await writeFile(join(root, "VERSION"), "2.4.6\n");
    const env = {
      KODY_CFG_RELEASE_VERSION_READCOMMAND: "cat VERSION",
      KODY_CFG_RELEASE_VERSION_WRITECOMMAND:
        "printf '%s\\n' \"$KODY_RELEASE_VERSION\" > VERSION",
      KODY_CFG_RELEASE_VERSION_FILES: '["VERSION"]',
    };

    assert.equal((await runVersion(root, "read", "", env)).stdout.trim(), "2.4.6");
    await runVersion(root, "write", "2.4.7", env);

    assert.equal(await readFile(join(root, "VERSION"), "utf8"), "2.4.7\n");
  });
});

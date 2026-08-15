import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const runner = new URL(
  "../catalog/capabilities/install-strategy-bundle/tools/run.sh",
  import.meta.url,
).pathname;

function run(root, installation) {
  const result = spawnSync(runner, [], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      KODY_CAPABILITY_INPUT: JSON.stringify({ installation }),
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

describe("install-strategy-bundle", () => {
  it("writes trusted files and merges configuration without removing values", async () => {
    const root = await mkdtemp(join(tmpdir(), "kody-strategy-install-"));
    await writeFile(
      join(root, "kody.config.json"),
      JSON.stringify({ activeWorkflows: ["existing"], model: "keep-me" }),
    );

    const output = run(root, {
      configPatch: { activeWorkflows: ["existing", "web-release"] },
      files: [{ path: ".kody-engine/definitions/loops/web/loop.json", content: "{\n}\n" }],
    });

    assert.equal(output.status, "installed");
    assert.deepEqual(
      JSON.parse(await readFile(join(root, "kody.config.json"), "utf8")),
      {
        activeWorkflows: ["existing", "web-release"],
        model: "keep-me",
      },
    );
    assert.equal(
      await readFile(
        join(root, ".kody-engine/definitions/loops/web/loop.json"),
        "utf8",
      ),
      "{\n}\n",
    );
  });

  it("blocks paths outside the repository", async () => {
    const root = await mkdtemp(join(tmpdir(), "kody-strategy-install-"));
    await mkdir(join(root, "safe"));
    const output = run(root, {
      files: [{ path: "../outside.json", content: "{}" }],
    });
    assert.equal(output.status, "blocked");
    assert.match(output.summary, /unsafe installation path/i);
  });
});

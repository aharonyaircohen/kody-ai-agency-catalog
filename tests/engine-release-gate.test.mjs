import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = new URL("..", import.meta.url).pathname;

describe("Engine release gate", () => {
  it("is a read-only Store workflow with a deterministic script Capability", async () => {
    const workflow = JSON.parse(
      await readFile(
        join(root, "catalog/workflows/engine-release-gate/workflow.json"),
        "utf8",
      ),
    );
    const contract = JSON.parse(
      await readFile(
        join(root, "catalog/capabilities/release-gate-probe/contract.json"),
        "utf8",
      ),
    );
    const script = await readFile(
      join(root, "catalog/capabilities/release-gate-probe/tools/run.sh"),
      "utf8",
    );

    assert.equal(workflow.name, "Engine Release Gate");
    assert.equal(workflow.agent, "kody");
    assert.equal(workflow.runWithoutApproval, true);
    assert.deepEqual(workflow.steps, [
      { id: "probe", capability: "release-gate-probe" },
    ]);
    assert.equal(contract.execution, "script");
    assert.deepEqual(contract.input, {
      type: "object",
      additionalProperties: false,
    });
    assert.deepEqual(contract.output.required, [
      "status",
      "repository",
      "commit",
    ]);
    assert.match(script, /git rev-parse HEAD/);
    assert.match(script, /KODY_CFG_GITHUB_OWNER/);
    assert.doesNotMatch(script, /gh\s/);
  });
});

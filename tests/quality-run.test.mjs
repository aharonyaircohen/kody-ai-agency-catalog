import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = new URL("..", import.meta.url).pathname;

describe("Quality Run", () => {
  it("uses one deterministic workflow and exact test identity", async () => {
    const workflow = JSON.parse(await readFile(join(root, "catalog/workflows/quality-run/workflow.json"), "utf8"));
    const contract = JSON.parse(await readFile(join(root, "catalog/capabilities/quality-check/contract.json"), "utf8"));
    const runner = await readFile(join(root, "catalog/capabilities/quality-check/tools/scripts/quality-check.mjs"), "utf8");
    assert.equal(workflow.name, "Quality Run");
    assert.equal(workflow.steps.length, 1);
    assert.equal(workflow.steps[0].capability, "quality-check");
    assert.equal(workflow.runWithoutApproval, true);
    assert.equal("version" in workflow, false);
    assert.deepEqual(contract.input.required, ["qualityRunId", "testId", "targetUrl", "sourceCommit"]);
    assert.match(runner, /--test-id/);
    assert.match(runner, /KODY_QUALITY_RESULT/);
  });
});

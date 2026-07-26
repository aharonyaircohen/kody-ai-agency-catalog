import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const warehouseWorkflows = new URL("../warehouse/workflows/", import.meta.url).pathname;

describe("warehouse workflows", () => {
  it("keeps Chore Flow reviewing until the PR passes", async () => {
    const workflow = JSON.parse(
      await readFile(join(warehouseWorkflows, "chore", "workflow.json"), "utf8"),
    );
    const steps = new Map(workflow.steps.map((step) => [step.id, step]));

    assert.equal(workflow.startAt, "run");
    assert.equal(steps.get("run").next, "review");
    assert.deepEqual(steps.get("review").next, [
      {
        to: "$end",
        when: { "lastOutcome.type": "REVIEW_PASS" },
      },
      {
        to: "fix",
        default: true,
      },
    ]);
    assert.deepEqual(steps.get("review").continueOn, ["REVIEW_FAIL"]);
    assert.deepEqual(steps.get("fix").next, [
      {
        to: "review",
        default: true,
        maxIterations: 3,
      },
    ]);
  });
});

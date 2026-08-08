import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("Store Pipelines", () => {
  it("composes Review and Fix with Merge without copying either Workflow", async () => {
    const pipeline = JSON.parse(
      await readFile(
        new URL(
          "../catalog/pipelines/review-and-merge/pipeline.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.deepEqual(
      pipeline.steps.map((step) => step.workflow),
      ["review-merge", "merge"],
    );
    assert.equal(
      pipeline.steps.some((step) => "capability" in step),
      false,
    );
  });

  it("makes a refused Merge block its parent Pipeline", async () => {
    const contract = JSON.parse(
      await readFile(
        new URL("../catalog/capabilities/merge/contract.json", import.meta.url),
        "utf8",
      ),
    );

    assert.deepEqual(contract.output.properties.status.enum, [
      "merged",
      "blocked",
    ]);
    assert.ok(contract.output.required.includes("status"));
    assert.ok(contract.output.required.includes("merged"));
  });
});

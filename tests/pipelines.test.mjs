import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("Store Pipelines", () => {
  it("repairs CI, reviews the repaired PR, and only then merges it", async () => {
    const pipeline = JSON.parse(
      await readFile(
        new URL(
          "../catalog/pipelines/ci-repair/pipeline.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.deepEqual(
      pipeline.steps.map((step) => step.workflow),
      ["ci-repair", "review-fix", "merge"],
    );
    assert.equal(pipeline.runWithoutApproval, true);
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

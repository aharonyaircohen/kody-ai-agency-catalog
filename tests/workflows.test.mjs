import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const catalogWorkflows = new URL("../catalog/workflows/", import.meta.url).pathname;
const catalogCapabilities = new URL("../catalog/capabilities/", import.meta.url).pathname;

describe("published workflows", () => {
  it("publishes Chore Flow and keeps reviewing until the PR passes", async () => {
    const workflow = JSON.parse(
      await readFile(join(catalogWorkflows, "chore", "workflow.json"), "utf8"),
    );
    const steps = new Map(workflow.steps.map((step) => [step.id, step]));

    assert.equal(workflow.startAt, "run");
    assert.equal(steps.get("run").delivery, "pull-request");
    assert.equal(steps.get("run").next, "review");
    assert.deepEqual(steps.get("review").next, [
      {
        to: "$end",
        when: { "result.verdict": "pass" },
      },
      {
        to: "fix",
        default: true,
      },
    ]);
    assert.equal("continueOn" in steps.get("review"), false);
    assert.equal(steps.get("fix").delivery, "pull-request");
    assert.deepEqual(steps.get("fix").next, [
      {
        to: "review",
        default: true,
        maxIterations: 3,
      },
    ]);
  });

  it("keeps the review capability output aligned with Chore Flow conditions", async () => {
    const instructions = await readFile(
      join(catalogCapabilities, "review", "instructions.md"),
      "utf8",
    );

    assert.match(instructions, /"verdict": "pass"/);
    assert.doesNotMatch(instructions, /## Verdict:/);
  });
});

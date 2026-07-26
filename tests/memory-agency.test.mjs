import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = new URL("../", import.meta.url).pathname;

async function json(path) {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

async function text(path) {
  return await readFile(join(root, path), "utf8");
}

describe("repository memory Agency", () => {
  it("learns from completed runs without touching personal memory", async () => {
    const workflow = await json(
      "catalog/workflows/learn-from-runs/workflow.json",
    );
    const steps = new Map(workflow.steps.map((step) => [step.id, step]));

    assert.equal(workflow.agent, "memory-steward");
    assert.equal(workflow.startAt, "extract");
    assert.equal(steps.get("extract").capability, "extract-run-learning");
    assert.equal(steps.get("extract").next, "duplicates");
    assert.equal(
      steps.get("duplicates").capability,
      "detect-memory-duplicates",
    );
    assert.equal(steps.get("duplicates").next, "conflicts");
    assert.equal(
      steps.get("conflicts").capability,
      "detect-memory-conflicts",
    );
    assert.equal(steps.get("conflicts").next, "decide");
    assert.equal(steps.get("decide").capability, "decide-memory-change");
    assert.equal(steps.get("decide").next, "apply");
    assert.equal(steps.get("apply").capability, "apply-memory-changes");
    assert.equal(steps.get("apply").next, "verify");
    assert.equal(steps.get("verify").capability, "verify-memory-change");

    const extract = await text(
      "catalog/capabilities/extract-run-learning/instructions.md",
    );
    assert.match(extract, /completed run/i);
    assert.match(extract, /repository memory only/i);
    assert.match(extract, /never personal memory/i);

    const decide = await text(
      "catalog/capabilities/decide-memory-change/instructions.md",
    );
    assert.match(decide, /create.*update.*skip/is);
    assert.match(decide, /never delete/i);
    assert.match(decide, /engine-run/i);

    const apply = await text(
      "catalog/capabilities/apply-memory-changes/instructions.md",
    );
    assert.match(apply, /accepted.*create.*update/is);
    assert.match(apply, /never.*delete/is);
  });

  it("runs learning and maintenance automatically", async () => {
    const learning = await json(
      "catalog/loops/learn-from-runs/loop.json",
    );
    assert.equal(learning.enabled, true);
    assert.deepEqual(learning.target, {
      kind: "workflow",
      id: "learn-from-runs",
    });
    assert.equal(learning.trigger.type, "schedule");

    const maintenance = await json(
      "catalog/loops/maintain-memory-quality/loop.json",
    );
    assert.equal(maintenance.enabled, true);
    assert.deepEqual(maintenance.target, {
      kind: "workflow",
      id: "maintain-memory-quality",
    });
    assert.equal(maintenance.trigger.type, "schedule");

    const workflow = await json(
      "catalog/workflows/maintain-memory-quality/workflow.json",
    );
    const capabilities = workflow.steps.map((step) => step.capability);
    assert.deepEqual(capabilities, [
      "detect-stale-memory",
      "detect-memory-conflicts",
      "decide-memory-change",
      "apply-memory-changes",
      "verify-memory-change",
    ]);
  });

  it("uses an identity that protects evidence and revision history", async () => {
    const agent = await text("agents/memory-steward.md");
    assert.match(agent, /^# Memory Steward/m);
    assert.match(agent, /Identity only/);
    assert.match(agent, /source run/i);
    assert.match(agent, /revision history/i);
    assert.match(agent, /never.*personal memory/is);
    assert.match(agent, /never.*delete/is);
  });

  it("declares strict contracts and the shared typed-memory tool", async () => {
    const capabilities = [
      "extract-run-learning",
      "detect-memory-duplicates",
      "detect-memory-conflicts",
      "detect-stale-memory",
      "decide-memory-change",
      "apply-memory-changes",
      "verify-memory-change",
    ];

    for (const capability of capabilities) {
      const contract = await json(
        `catalog/capabilities/${capability}/contract.json`,
      );
      assert.equal(contract.input.type, "object");
      assert.equal(contract.input.additionalProperties, false);
      assert.equal(contract.output.type, "object");
      assert.equal(contract.output.additionalProperties, false);
      assert.match(
        await text(
          `catalog/capabilities/${capability}/tools/kody-memory.mjs`,
        ),
        /kody-memory-client/,
      );
    }
  });
});

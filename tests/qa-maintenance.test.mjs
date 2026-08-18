import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(`../catalog/${path}`, import.meta.url), "utf8"));

describe("QA maintenance", () => {
  it("gives every scan and finding a stable identity", async () => {
    const contract = await readJson("capabilities/qa-engineer/contract.json");
    assert.ok(contract.output.required.includes("scanId"));
    assert.ok(contract.output.required.includes("verdict"));
    assert.equal("status" in contract.output.properties, false);
    assert.ok(contract.output.properties.findings.items.required.includes("id"));
  });

  it("ranks all findings, preserves existing issues, and emits one delivery decision", async () => {
    const contract = await readJson("capabilities/qa-issue-sync/contract.json");
    const instructions = await readFile(
      new URL("../catalog/capabilities/qa-issue-sync/instructions.md", import.meta.url),
      "utf8",
    );
    assert.deepEqual(contract.output.properties.deliveryDecision.enum, [
      "continue",
      "approval",
      "stop",
    ]);
    assert.equal("requirements" in contract, false);
    assert.ok(contract.output.required.includes("syncStatus"));
    assert.equal("status" in contract.output.properties, false);
    assert.match(instructions, /rank every finding before/i);
    assert.match(instructions, /do not edit, comment on,\s+reopen, or close/i);
    assert.match(instructions, /stable finding marker/i);
    assert.match(instructions, /already processed/i);
  });

  it("syncs issues, gates delivery, fixes, reviews, and merges", async () => {
    const pipeline = await readJson("pipelines/qa-maintenance/pipeline.json");
    assert.equal(pipeline.runWithoutApproval, true);
    assert.deepEqual(
      pipeline.steps.map((step) => step.workflow),
      ["qa-issue-sync", "qa-fix", "review-fix", "merge"],
    );
    assert.equal(pipeline.steps[0].decisionFact, "deliveryDecision");

    const trigger = await readJson("triggers/qa-maintenance-after-scan/trigger.json");
    assert.equal(trigger.event, "kody.workflow.completed");
    assert.deepEqual(trigger.conditions, [
      { path: "workflowId", op: "equals", value: "qa-scan" },
      { path: "status", op: "equals", value: "success" },
    ]);
    assert.equal(trigger.action.type, "start-pipeline");
    assert.equal(trigger.action.pipelineId, "qa-maintenance");
    assert.equal(trigger.action.concurrencyKey, "scanId");
  });

  it("publishes scan and processing reports", async () => {
    const scan = await readJson("workflows/qa-scan/workflow.json");
    const sync = await readJson("workflows/qa-issue-sync/workflow.json");
    assert.equal(scan.report.type, "qa-scan");
    assert.equal(scan.report.slugFact, "scanId");
    assert.equal(sync.report.type, "qa-issue-sync");
    assert.equal(sync.report.slugFact, "processingId");
  });
});

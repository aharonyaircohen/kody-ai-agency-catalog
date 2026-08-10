import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = new URL("..", import.meta.url).pathname;

describe("Quality Run", () => {
  it("runs saved repository browser steps through one deterministic workflow", async () => {
    const workflow = JSON.parse(await readFile(join(root, "catalog/workflows/quality-run/workflow.json"), "utf8"));
    const contract = JSON.parse(await readFile(join(root, "catalog/capabilities/quality-check/contract.json"), "utf8"));
    const runner = await readFile(join(root, "catalog/capabilities/quality-check/tools/scripts/quality-check.mjs"), "utf8");
    const browserRunner = await readFile(join(root, "catalog/capabilities/quality-check/tools/scripts/browser-steps.mjs"), "utf8");
    assert.equal(workflow.name, "Quality Run");
    assert.equal(workflow.steps.length, 1);
    assert.equal(workflow.steps[0].capability, "quality-check");
    assert.equal(workflow.runWithoutApproval, true);
    assert.equal("version" in workflow, false);
    assert.deepEqual(contract.input.required, ["qualityRunId", "journeyName", "steps", "targetUrl", "sourceCommit"]);
    assert.equal("secrets" in contract, false);
    assert.ok(Array.isArray(contract.input.properties.steps.items.oneOf));
    assert.match(runner, /browser-steps\.mjs/);
    assert.match(browserRunner, /operation === "open"/);
    assert.match(browserRunner, /operation === "click"/);
    assert.match(browserRunner, /operation === "fill"/);
    assert.match(browserRunner, /operation === "reload"/);
    assert.match(browserRunner, /operation === "check"/);
    assert.match(browserRunner, /@playwright\/test/);
    assert.match(runner, /KODY_QUALITY_RESULT/);
    assert.doesNotMatch(runner, /DASHBOARD_URL/);
    assert.match(runner, /clean\(environment\.GITHUB_SERVER_URL\) \|\| "https:\/\/github\.com"/);
  });
});

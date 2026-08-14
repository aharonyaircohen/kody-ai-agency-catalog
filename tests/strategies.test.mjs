import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { validateStrategyBlueprint } from "@kody-ade/engine-contracts";

const root = new URL("../catalog/", import.meta.url).pathname;

describe("Strategy Blueprints", () => {
  it("publishes valid executable Blueprints", async () => {
    const entries = await readdir(join(root, "strategies"), {
      withFileTypes: true,
    });
    assert.ok(entries.length > 0);

    for (const entry of entries) {
      assert.ok(entry.isDirectory());
      const folder = join(root, "strategies", entry.name);
      const files = (await readdir(folder)).sort();
      assert.deepEqual(files, ["instructions.md", "strategy.json"]);
      const blueprint = JSON.parse(
        await readFile(join(folder, "strategy.json"), "utf8"),
      );
      assert.equal(blueprint.id, entry.name);
      assert.deepEqual(validateStrategyBlueprint(blueprint), []);
      assert.ok(
        (await readFile(join(folder, blueprint.instructions), "utf8")).trim(),
      );
    }
  });

  it("defines Healthy CI as native setup plus the existing repair solution", async () => {
    const blueprint = JSON.parse(
      await readFile(
        join(root, "strategies", "healthy-ci", "strategy.json"),
        "utf8",
      ),
    );
    assert.equal(blueprint.application.workflowId, "apply-strategy");
    assert.deepEqual(blueprint.application.activate, [
      { kind: "solution", id: "ci-repair" },
    ]);
    const applicationContract = JSON.parse(
      await readFile(
        join(root, "capabilities", "apply-strategy", "contract.json"),
        "utf8",
      ),
    );
    assert.deepEqual(applicationContract.deliveryPathAllowlist, [
      ".github/workflows/**",
      "kody.config.json",
    ]);
    assert.deepEqual(applicationContract.input.properties.installation, {
      type: "object",
    });
    const workflow = JSON.parse(
      await readFile(
        join(root, "workflows", "apply-strategy", "workflow.json"),
        "utf8",
      ),
    );
    assert.deepEqual(workflow.inputSchema.properties.installation, {
      type: "object",
    });
    assert.deepEqual(workflow.steps[1].inputs.installation, {
      from: "workflow.input.installation",
    });
    assert.deepEqual(workflow.steps[3].inputs.failure, {
      from: "steps.check-pr.result.failure",
    });
    const instructions = await readFile(
      join(root, "capabilities", "apply-strategy", "instructions.md"),
      "utf8",
    );
    assert.match(instructions, /kody\.config\.json/);
    assert.match(instructions, /same pull request/i);
  });
});

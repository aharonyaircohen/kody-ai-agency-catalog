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
  });
});

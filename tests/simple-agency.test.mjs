import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = new URL("../", import.meta.url).pathname;

describe("simple Agency Store", () => {
  it("contains only simple Capability folders", async () => {
    const capabilities = await readdir(join(root, "capabilities"), {
      withFileTypes: true,
    });
    assert.ok(capabilities.length > 0);
    for (const capability of capabilities) {
      if (!capability.isDirectory()) continue;
      const entries = await readdir(join(root, "capabilities", capability.name), {
        withFileTypes: true,
      });
      assert.deepEqual(
        entries.map((entry) => entry.name).sort(),
        ["contract.json", "instructions.md", "skills", "tools"],
      );
      const contract = JSON.parse(
        await readFile(
          join(root, "capabilities", capability.name, "contract.json"),
          "utf8",
        ),
      );
      assert.deepEqual(Object.keys(contract).sort(), ["input", "output"]);
    }
  });

  it("keeps Workflow conditions and selects one Agent", async () => {
    const workflows = await readdir(join(root, "workflows"), {
      withFileTypes: true,
    });
    for (const workflow of workflows) {
      if (!workflow.isDirectory()) continue;
      const value = JSON.parse(
        await readFile(
          join(root, "workflows", workflow.name, "workflow.json"),
          "utf8",
        ),
      );
      assert.equal(typeof value.agent, "string");
      assert.equal("version" in value, false);
      for (const step of value.steps ?? []) assert.equal("agent" in step, false);
    }
  });

  it("migrates scheduled Goal templates to simple Loops", async () => {
    const roots = await readdir(root);
    assert.equal(roots.includes("implementations"), false);
    assert.equal(roots.includes("goals"), false);
    assert.equal(roots.includes("loops"), true);
    const loop = JSON.parse(
      await readFile(
        join(root, "loops", "daily-web-release-loop", "loop.json"),
        "utf8",
      ),
    );
    assert.deepEqual(loop.target, { kind: "workflow", id: "web-release" });
    assert.deepEqual(loop.trigger, { type: "schedule", every: "1d" });
  });
});

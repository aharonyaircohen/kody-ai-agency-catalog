import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

describe("QA Engineer", () => {
  it("uses one workflow with explicit safe scan modes", async () => {
    const workflow = JSON.parse(
      await readFile(
        join(root, "catalog/workflows/qa-scan/workflow.json"),
        "utf8",
      ),
    );
    const contract = JSON.parse(
      await readFile(
        join(root, "catalog/capabilities/qa-engineer/contract.json"),
        "utf8",
      ),
    );
    const instructions = await readFile(
      join(root, "catalog/capabilities/qa-engineer/instructions.md"),
      "utf8",
    );

    assert.deepEqual(workflow.inputSchema.properties.mode.enum, [
      "read-only",
      "test",
    ]);
    assert.ok(workflow.inputSchema.required.includes("mode"));
    assert.deepEqual(contract.input.properties.mode.enum, [
      "read-only",
      "test",
    ]);
    assert.ok(contract.input.required.includes("mode"));
    assert.deepEqual(contract.requirements, {
      browser: true,
      githubTestToken: true,
    });
    assert.match(instructions, /Scan mode: `\{\{args\.mode\}\}`/);
    assert.match(instructions, /supplied non-production target/);
    assert.match(instructions, /at most 12 purposeful checks/);
    assert.match(instructions, /stop after 5\s+reproducible findings/);
  });
});

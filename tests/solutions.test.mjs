import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = new URL("../catalog/", import.meta.url).pathname;

describe("Store Solutions", () => {
  it("publishes complete setups without duplicating dependencies", async () => {
    const solutionEntries = await readdir(join(root, "solutions"), {
      withFileTypes: true,
    });
    assert.ok(solutionEntries.length > 0);

    const workflows = new Set(
      (await readdir(join(root, "workflows"), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    );
    const loops = new Set(
      (await readdir(join(root, "loops"), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    );
    const pipelines = new Set(
      (await readdir(join(root, "pipelines"), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    );

    for (const entry of solutionEntries) {
      assert.ok(entry.isDirectory());
      const solution = JSON.parse(
        await readFile(
          join(root, "solutions", entry.name, "solution.json"),
          "utf8",
        ),
      );
      assert.equal(solution.schemaVersion, 1);
      assert.equal(solution.id, entry.name);
      assert.ok(solution.name.trim());
      assert.ok(solution.description.trim());
      assert.ok(solution.entrypoints.length > 0);
      assert.equal("category" in solution, false);
      assert.equal("dependencies" in solution, false);

      for (const entrypoint of solution.entrypoints) {
        assert.ok(
          entrypoint.kind === "loop" ||
            entrypoint.kind === "pipeline" ||
            entrypoint.kind === "workflow",
        );
        const available =
          entrypoint.kind === "loop"
            ? loops
            : entrypoint.kind === "pipeline"
              ? pipelines
              : workflows;
        assert.ok(
          available.has(entrypoint.id),
          `${solution.id}: missing ${entrypoint.kind} ${entrypoint.id}`,
        );
      }
    }
  });

  it("defines Review and Merge from its Pipeline entry point", async () => {
    const solution = JSON.parse(
      await readFile(
        join(root, "solutions", "review-and-merge", "solution.json"),
        "utf8",
      ),
    );
    assert.deepEqual(solution.entrypoints, [
      { kind: "pipeline", id: "review-and-merge" },
    ]);
  });

  it("defines Web Release from its Loop entry point", async () => {
    const solution = JSON.parse(
      await readFile(
        join(root, "solutions", "web-release", "solution.json"),
        "utf8",
      ),
    );
    assert.deepEqual(solution.entrypoints, [
      { kind: "loop", id: "daily-web-release-loop" },
    ]);
  });
});

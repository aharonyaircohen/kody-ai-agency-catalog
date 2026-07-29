import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = new URL("../catalog/", import.meta.url).pathname;
const warehouseRoot = new URL("../warehouse/", import.meta.url).pathname;

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
      const names = entries.map((entry) => entry.name).sort();
      assert.ok(
        names.every((name) =>
          ["contract.json", "instructions.md", "skills", "tools"].includes(name),
        ),
      );
      assert.ok(names.includes("instructions.md"));
      assert.ok(names.includes("skills"));
      assert.ok(names.includes("tools"));
      const instructions = await readFile(
        join(root, "capabilities", capability.name, "instructions.md"),
        "utf8",
      );
      assert.ok(instructions.trim());
      if (names.includes("contract.json")) {
        const contract = JSON.parse(
          await readFile(
            join(root, "capabilities", capability.name, "contract.json"),
            "utf8",
          ),
        );
        assert.ok(
          contract.execution === "agent" || contract.execution === "script",
          `${capability.name}: contract execution must be agent or script`,
        );
        if (contract.execution === "script") {
          const entrypoint = await readFile(
            join(root, "capabilities", capability.name, "tools", "run.sh"),
            "utf8",
          );
          assert.ok(entrypoint.trim());
        }
      }
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
      for (const step of value.steps ?? []) {
        assert.equal("agent" in step, false);
        assert.equal("cliArgs" in step, false);
        assert.equal("inputs" in step, false);
      }
      if (value.startAt) {
        const byId = new Map((value.steps ?? []).map((step) => [step.id, step]));
        const reachable = new Set();
        const pending = [value.startAt];
        while (pending.length > 0) {
          const id = pending.pop();
          if (!id || reachable.has(id)) continue;
          reachable.add(id);
          const next = byId.get(id)?.next;
          for (const transition of Array.isArray(next) ? next : [next]) {
            const target =
              typeof transition === "string" ? transition : transition?.to;
            if (target && target !== "$end") pending.push(target);
          }
        }
        assert.equal(
          reachable.size,
          value.steps.length,
          `${workflow.name} contains unreachable steps`,
        );
      }
    }
  });

  it("keeps CI repair gated by PR CI and review", async () => {
    const value = JSON.parse(
      await readFile(
        join(root, "workflows", "ci-repair", "workflow.json"),
        "utf8",
      ),
    );
    const byId = new Map(value.steps.map((step) => [step.id, step]));

    assert.equal(byId.get("repair").next, "check-pr");
    assert.deepEqual(byId.get("check").next[0], {
      to: "check-pr",
      when: { "result.hasOpenPr": true },
    });
    assert.deepEqual(byId.get("check-pr").next, [
      { to: "fix", when: { "result.status": "red" } },
      { to: "review", when: { "result.status": "healthy" } },
      { to: "$end", when: { "result.status": "blocked" } },
      { to: "$end", default: true },
    ]);
    assert.equal(byId.get("check-pr").targetFact, "pr");
    assert.deepEqual(byId.get("review").next, [
      { to: "merge", when: { "result.verdict": "pass" } },
      { to: "fix", default: true },
    ]);
    assert.deepEqual(byId.get("fix").next, [
      { to: "$end", when: { "result.status": "blocked" } },
      { to: "check-pr", default: true, maxIterations: 3 },
    ]);
    assert.equal(byId.get("fix").delivery, "pull-request");
    assert.equal(byId.get("merge").target, "pr");

    const healthInstructions = await readFile(
      join(root, "capabilities", "ci-health-check", "instructions.md"),
      "utf8",
    );
    assert.match(healthInstructions, /latest \*\*completed repository CI\*\*/);
    assert.match(healthInstructions, /Ignore the current Kody run/);
    assert.match(healthInstructions, /When `pr` is present, wait/);
    assert.match(healthInstructions, /30 minutes/);
    assert.match(healthInstructions, /`blocked`/);

    const fixInstructions = await readFile(
      join(root, "capabilities", "fix", "instructions.md"),
      "utf8",
    );
    assert.match(fixInstructions, /Always finish by returning exactly one JSON object/);
    assert.match(fixInstructions, /merge the latest base branch/);
    assert.match(fixInstructions, /Do not run\s+the repository's full CI suite locally/);
    assert.match(fixInstructions, /five minutes in total/);
  });

  it("ships the complete daily web release bundle in the active catalog", async () => {
    const loop = JSON.parse(
      await readFile(
        join(root, "loops", "daily-web-release-loop", "loop.json"),
        "utf8",
      ),
    );
    assert.deepEqual(loop.target, {
      kind: "workflow",
      id: "web-release",
    });

    const workflow = JSON.parse(
      await readFile(
        join(root, "workflows", "web-release", "workflow.json"),
        "utf8",
      ),
    );
    assert.equal(workflow.startAt, "prepare");
    assert.ok(
      workflow.steps.every(
        (step) => typeof step.id === "string" && step.id.length > 0,
      ),
      "web-release steps must have runnable ids",
    );
    const capabilities = new Set(
      workflow.steps.map((step) => step.capability),
    );
    assert.deepEqual(capabilities, new Set([
      "release-prepare",
      "release-validate",
      "release-merge",
      "release-promote",
      "release-deploy",
    ]));
    for (const capability of capabilities) {
      await readFile(
        join(root, "capabilities", capability, "instructions.md"),
        "utf8",
      );
    }

    await assert.rejects(
      readFile(
        join(
          warehouseRoot,
          "loops",
          "daily-web-release-loop",
          "loop.json",
        ),
        "utf8",
      ),
      { code: "ENOENT" },
    );
  });

  it("keeps the active catalog separate from the warehouse", async () => {
    const roots = await readdir(root);
    assert.deepEqual(roots.sort(), ["capabilities", "loops", "workflows"]);
    const loop = JSON.parse(
      await readFile(
        join(root, "loops", "ci-repair", "loop.json"),
        "utf8",
      ),
    );
    assert.deepEqual(loop.target, { kind: "workflow", id: "ci-repair" });
    assert.deepEqual(loop.trigger, { type: "schedule", every: "15m" });
  });
});

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
      ".kody-engine/definitions/loops/**",
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
    const fixStep = workflow.steps.find((step) => step.id === "fix-ci");
    assert.deepEqual(fixStep.inputs.failure, {
      from: "steps.check-pr.result.failure",
    });
    const instructions = await readFile(
      join(root, "capabilities", "apply-strategy", "instructions.md"),
      "utf8",
    );
    assert.match(instructions, /kody\.config\.json/);
    assert.match(instructions, /installation\.files/);
    assert.match(instructions, /Maintainer/);
    assert.match(instructions, /same pull request/i);
    assert.match(instructions, /inspect the repository diff/i);
    assert.match(instructions, /no repository diff exists/i);
    assert.match(instructions, /produce the repository diff before/i);
    assert.match(instructions, /pull-request CI owns the full validation/i);
    const skill = await readFile(
      join(
        root,
        "capabilities",
        "apply-strategy",
        "skills",
        "apply-strategy",
        "SKILL.md",
      ),
      "utf8",
    );
    assert.match(skill, /inspect the repository diff/i);
    assert.match(skill, /return `blocked` when no diff exists/i);
    assert.match(skill, /produce the repository diff before/i);
    assert.match(skill, /pull-request CI owns the full validation/i);
  });

  it("defines Web Release with the existing release behavior and configuration", async () => {
    const blueprint = JSON.parse(
      await readFile(
        join(root, "strategies", "web-release", "strategy.json"),
        "utf8",
      ),
    );
    assert.equal(blueprint.application.workflowId, "apply-strategy");
    assert.deepEqual(blueprint.application.activate, [
      { kind: "solution", id: "web-release" },
    ]);

    const instructions = await readFile(
      join(root, "strategies", "web-release", "instructions.md"),
      "utf8",
    );
    assert.equal(blueprint.version, "1.0.3");
    assert.match(instructions, /Constructor/);
    assert.match(instructions, /Maintainer Loop/);
    for (const property of [
      "git.defaultBranch",
      "release.version",
      "release.validation",
      "release.releaseBranch",
      "release.allowAdminMerge",
      "release.productionUrl",
      "release.smokeCommand",
      "release.productionDeployRequired",
      "release.timeoutMs",
    ]) {
      assert.match(instructions, new RegExp(property.replace(".", "\\.")));
    }

    const criteria = blueprint.verification.criteria.join("\n");
    assert.match(criteria, /release pull request/i);
    assert.match(criteria, /repository-owned validation/i);
    assert.match(criteria, /default branch/i);
    assert.match(criteria, /release branch/i);
    assert.match(criteria, /Vercel production/i);
    assert.match(criteria, /smoke/i);
  });
});

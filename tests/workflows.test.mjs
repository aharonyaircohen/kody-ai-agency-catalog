import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const catalogWorkflows = new URL("../catalog/workflows/", import.meta.url).pathname;
const catalogCapabilities = new URL("../catalog/capabilities/", import.meta.url).pathname;

describe("published workflows", () => {
  it("publishes Chore Flow and keeps reviewing until the PR passes", async () => {
    const workflow = JSON.parse(
      await readFile(join(catalogWorkflows, "chore", "workflow.json"), "utf8"),
    );
    const steps = new Map(workflow.steps.map((step) => [step.id, step]));

    assert.equal(workflow.startAt, "run");
    assert.equal(steps.get("run").delivery, "pull-request");
    assert.equal(steps.get("run").next, "review");
    assert.deepEqual(steps.get("review").next, [
      {
        to: "fix",
        when: { "result.verdict": "fix" },
        maxIterations: 3,
      },
      {
        to: "$end",
        default: true,
      },
    ]);
    assert.equal("continueOn" in steps.get("review"), false);
    assert.equal(steps.get("fix").delivery, "pull-request");
    assert.deepEqual(steps.get("fix").next, [
      {
        to: "review",
        default: true,
        maxIterations: 3,
      },
    ]);
  });

  it("declares the review result once as a machine-readable contract", async () => {
    const [contract, instructions, skill] = await Promise.all([
      readFile(join(catalogCapabilities, "review", "contract.json"), "utf8").then(JSON.parse),
      readFile(join(catalogCapabilities, "review", "instructions.md"), "utf8"),
      readFile(
        join(catalogCapabilities, "review", "skills", "code-review", "SKILL.md"),
        "utf8",
      ),
    ]);

    assert.deepEqual(contract.output.properties.verdict.enum, ["pass", "fix"]);
    assert.deepEqual(contract.output.required, ["verdict", "feedback", "summary"]);
    assert.match(instructions, /machine-readable decision/i);
    assert.doesNotMatch(skill, /Return raw markdown only/);
    assert.match(skill, /capability output contract/i);
  });

  it("declares every result field consumed by active Workflow conditions", async () => {
    const expectations = new Map([
      ["ci-health-check", ["hasOpenPr", "needsRepair", "status"]],
      ["fix", ["status"]],
      ["review", ["verdict"]],
    ]);

    for (const [slug, fields] of expectations) {
      const contract = JSON.parse(
        await readFile(join(catalogCapabilities, slug, "contract.json"), "utf8"),
      );
      for (const field of fields) {
        assert.ok(contract.output.properties[field], `${slug} must declare ${field}`);
      }
    }
  });

  it("keeps pull-request delivery out of capability responsibilities", async () => {
    for (const slug of ["run", "fix"]) {
      const instructions = await readFile(
        join(catalogCapabilities, slug, "instructions.md"),
        "utf8",
      );
      assert.doesNotMatch(instructions, /open a draft (?:pull request|PR)/i);
      assert.doesNotMatch(instructions, /commit and push/i);
      assert.match(instructions, /delivery wrapper/i);
    }
  });

  it("keeps production secrets least-privilege and release branches synchronized", async () => {
    const [contract, deployContract, prepareContract, validateContract, promoteContract, mergeContract, mergeScript, prepareScript, promoteScript, workflow] = await Promise.all([
      readFile(
        join(catalogCapabilities, "vercel-production-deploy", "contract.json"),
        "utf8",
      ).then(JSON.parse),
      readFile(
        join(catalogCapabilities, "release-deploy", "contract.json"),
        "utf8",
      ).then(JSON.parse),
      readFile(
        join(catalogCapabilities, "release-prepare", "contract.json"),
        "utf8",
      ).then(JSON.parse),
      readFile(
        join(catalogCapabilities, "release-validate", "contract.json"),
        "utf8",
      ).then(JSON.parse),
      readFile(
        join(catalogCapabilities, "release-promote", "contract.json"),
        "utf8",
      ).then(JSON.parse),
      readFile(
        join(catalogCapabilities, "release-merge", "contract.json"),
        "utf8",
      ).then(JSON.parse),
      readFile(
        join(
          catalogCapabilities,
          "release-merge",
          "tools",
          "scripts",
          "release-merge.sh",
        ),
        "utf8",
      ),
      readFile(
        join(
          catalogCapabilities,
          "release-prepare",
          "tools",
          "scripts",
          "prepare.sh",
        ),
        "utf8",
      ),
      readFile(
        join(
          catalogCapabilities,
          "release-promote",
          "tools",
          "scripts",
          "release-promote.sh",
        ),
        "utf8",
      ),
      readFile(
        join(catalogWorkflows, "web-release", "workflow.json"),
        "utf8",
      ).then(JSON.parse),
    ]);

    assert.equal(contract.execution, "script");
    assert.deepEqual(contract.secrets, [
      "VERCEL_ACCESS_TOKEN",
      "VERCEL_ORG_ID",
      "VERCEL_PROJECT_ID",
    ]);
    assert.equal(deployContract.execution, "script");
    assert.deepEqual(deployContract.secrets ?? [], []);
    assert.equal(prepareContract.execution, "script");
    assert.equal(validateContract.execution, "script");
    assert.deepEqual(validateContract.input.required, ["pr"]);
    assert.equal(workflow.steps[1].capability, "release-validate");
    assert.equal(workflow.steps[1].targetFact, "releasePr");
    assert.equal(promoteContract.execution, "script");
    assert.ok(promoteContract.output.properties.facts.properties.promotionPr);
    assert.equal(mergeContract.execution, "script");
    assert.deepEqual(mergeContract.input.required, ["pr"]);
    assert.match(mergeScript, /sync_promotion_back_to_default/);
    assert.match(mergeScript, /repos\/\{owner\}\/\{repo\}\/merges/);
    assert.match(prepareScript, /release-version\.sh/);
    assert.match(promoteScript, /KODY_CFG_RELEASE_VERSION_READCOMMAND/);
    assert.equal(workflow.steps.at(-1).capability, "release-deploy");
  });
});

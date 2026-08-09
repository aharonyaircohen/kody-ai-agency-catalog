import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
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
    assert.deepEqual(contract.output.required, ["verdict", "feedback", "summary", "headSha"]);
    assert.equal(contract.output.properties.headSha.type, "string");
    assert.match(instructions, /machine-readable decision/i);
    assert.match(instructions, /exact commit/i);
    assert.doesNotMatch(skill, /Return raw markdown only/);
    assert.match(skill, /capability output contract/i);
  });

  it("passes review evidence into the reusable Merge Workflow", async () => {
    const [workflow, instructions] = await Promise.all([
      readFile(join(catalogWorkflows, "merge", "workflow.json"), "utf8").then(JSON.parse),
      readFile(join(catalogCapabilities, "merge", "instructions.md"), "utf8"),
    ]);

    assert.ok(workflow.inputSchema.properties.headSha);
    assert.ok(workflow.inputSchema.properties.verdict);
    assert.ok(workflow.inputSchema.properties.status);
    assert.match(instructions, /review result/i);
    assert.match(instructions, /current PR head/i);
  });

  it("declares every result field consumed by active Workflow conditions", async () => {
    const expectations = new Map([
      ["ci-health-check", ["needsRepair", "status"]],
      ["prepare-ci-repair", ["hasOpenPr", "status"]],
      ["fix", ["status"]],
      ["review", ["verdict"]],
      ["ui-review", ["status"]],
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

  it("keeps CI Repair focused on one failed pull request", async () => {
    const workflow = JSON.parse(
      await readFile(
        join(catalogWorkflows, "ci-repair", "workflow.json"),
        "utf8",
      ),
    );

    assert.deepEqual(workflow.inputSchema.required, ["pr", "runId", "headSha"]);
    assert.equal(workflow.inputSchema.additionalProperties, false);
    assert.deepEqual(
      workflow.steps.map(({ id, capability, target }) => ({ id, capability, target })),
      [
        { id: "check", capability: "ci-health-check", target: "pr" },
        { id: "fix", capability: "fix", target: "pr" },
      ],
    );
    assert.equal(
      workflow.steps.some((step) => step.target === "issue"),
      false,
    );

    const fixContract = JSON.parse(
      await readFile(join(catalogCapabilities, "fix", "contract.json"), "utf8"),
    );
    assert.equal(fixContract.input.properties.runId.type, "integer");
    assert.equal(fixContract.input.properties.headSha.type, "string");
    assert.equal(fixContract.input.properties.runUrl.type, "string");
    assert.equal(fixContract.input.properties.failureLog.type, "string");

    const fixInstructions = await readFile(
      join(catalogCapabilities, "fix", "instructions.md"),
      "utf8",
    );
    assert.match(fixInstructions, /inspect that exact run/i);
    assert.match(fixInstructions, /no repository change/i);
    assert.match(fixInstructions, /do not merge or sync/i);
  });

  it("does not point a Capability at the wrong target kind", async () => {
    const workflowEntries = await readdir(catalogWorkflows, { withFileTypes: true });

    for (const entry of workflowEntries.filter((item) => item.isDirectory())) {
      const workflow = JSON.parse(
        await readFile(join(catalogWorkflows, entry.name, "workflow.json"), "utf8"),
      );
      for (const step of workflow.steps ?? []) {
        if (step.target !== "pr" && step.target !== "issue") continue;
        const contract = JSON.parse(
          await readFile(
            join(catalogCapabilities, step.capability, "contract.json"),
            "utf8",
          ),
        );
        const required = new Set(contract.input?.required ?? []);
        const requiredTarget = required.has("pr")
          ? "pr"
          : required.has("issue")
            ? "issue"
            : null;
        if (requiredTarget) {
          assert.equal(
            step.target,
            requiredTarget,
            `${entry.name}.${step.id} must target ${requiredTarget} for ${step.capability}`,
          );
        }
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
    const [contract, prepareContract, validateContract, promoteContract, mergeContract, mergeScript, prepareScript, promoteScript, workflow] = await Promise.all([
      readFile(
        join(catalogCapabilities, "vercel-production-deploy", "contract.json"),
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
    assert.equal(
      workflow.steps.at(-1).capability,
      "vercel-production-deploy",
      "the workflow must own its deployment capability choice",
    );
    assert.equal(
      workflow.steps.some((step) => step.capability === "release-deploy"),
      false,
      "the workflow must not delegate deployment selection back to repository config",
    );
  });
});

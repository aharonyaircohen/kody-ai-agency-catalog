import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const catalogWorkflows = new URL("../catalog/workflows/", import.meta.url).pathname;
const catalogCapabilities = new URL("../catalog/capabilities/", import.meta.url).pathname;
const storeManifest = JSON.parse(
  await readFile(new URL("../kody-store.json", import.meta.url), "utf8"),
);
const engineBuiltins = new Set(storeManifest.engineBuiltins ?? []);

describe("published workflows", () => {
  it("uses Engine run as a built-in instead of publishing a Store copy", async () => {
    const capabilityEntries = await readdir(catalogCapabilities);

    assert.deepEqual(storeManifest.engineBuiltins, ["run"]);
    assert.equal(capabilityEntries.includes("run"), false);
  });

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

  it("finishes Strategy application only after Blueprint-specific verification", async () => {
    const workflow = JSON.parse(
      await readFile(join(catalogWorkflows, "apply-strategy", "workflow.json"), "utf8"),
    );
    const byId = new Map(workflow.steps.map((step) => [step.id, step]));
    assert.deepEqual(byId.get("check-pr").next, [
      { to: "verify", when: { "result.status": "healthy" } },
      { to: "fix-ci", when: { "result.status": "red" } },
    ]);
    assert.equal(byId.get("verify").capability, "verify-strategy-application");
    assert.deepEqual(byId.get("verify").inputs, {
      blueprint: { from: "workflow.input.blueprint" },
      installation: { from: "workflow.input.installation" },
      pr: { from: "steps.check-pr.result.pr" },
    });
    assert.deepEqual(byId.get("verify").next, [
      { to: "$end", when: { "result.status": "verified" } },
    ]);
    assert.deepEqual(byId.get("fix-ci").next, [
      { to: "check-pr", maxIterations: 8 },
    ]);
  });

  it("creates a repair PR when the failed CI run has no pull request", async () => {
    const workflow = JSON.parse(
      await readFile(
        join(catalogWorkflows, "ci-repair", "workflow.json"),
        "utf8",
      ),
    );

    assert.deepEqual(workflow.inputSchema.required, ["branch", "ciRunId", "headSha"]);
    assert.deepEqual(workflow.report, {
      type: "ci-repair",
      version: 1,
      owner: "ci-repair",
      slug: "ci-repair",
      title: "CI Repair",
    });
    assert.ok(workflow.inputSchema.properties.pr);
    assert.equal(workflow.inputSchema.additionalProperties, false);
    assert.equal(workflow.startAt, "check");
    assert.deepEqual(
      workflow.steps.map(({ id, capability, target }) => ({ id, capability, target })),
      [
        { id: "check", capability: "ci-health-check", target: undefined },
        { id: "prepare", capability: "prepare-ci-repair", target: undefined },
        { id: "repair", capability: "fix-ci", target: "issue" },
        { id: "fix", capability: "fix-ci", target: "pr" },
        { id: "check-pr", capability: "ci-health-check", target: "pr" },
        {
          id: "finalize-healthy",
          capability: "finalize-ci-repair",
          target: undefined,
        },
        { id: "finalize", capability: "finalize-ci-repair", target: undefined },
      ],
    );
    assert.equal(
      workflow.steps.some((step) => step.target === "issue"),
      true,
    );
    assert.deepEqual(workflow.steps[0].next, [
      { to: "prepare", when: { "result.needsRepair": true } },
      { to: "finalize-healthy", default: true },
    ]);
    assert.deepEqual(workflow.steps[0].inputs, {
      branch: { from: "workflow.input.branch" },
      runId: { from: "workflow.input.ciRunId" },
      headSha: { from: "workflow.input.headSha" },
    });
    assert.deepEqual(workflow.steps[1].inputs, {
      status: { from: "steps.check.result.status" },
      pr: { from: "steps.check.result.pr" },
      branch: { from: "steps.check.result.branch" },
      runId: { from: "steps.check.result.runId" },
      headSha: { from: "steps.check.result.headSha" },
      runUrl: { from: "steps.check.result.runUrl" },
      failedChecks: { from: "steps.check.result.failedChecks" },
      failureLog: { from: "steps.check.result.failureLog" },
      summary: { from: "steps.check.result.summary" },
    });
    assert.deepEqual(workflow.steps[1].next, [
      { to: "finalize", when: { "result.status": "blocked" } },
      { to: "check-pr", when: { "result.hasOpenPr": true } },
      { to: "repair", default: true },
    ]);
    assert.equal(workflow.steps[2].targetFact, "issue");
    assert.equal(workflow.steps[2].delivery, "pull-request");
    assert.equal(workflow.steps[2].timeoutSeconds, 1800);
    assert.deepEqual(workflow.steps[2].continueOn, ["RUN_FAILED"]);
    assert.deepEqual(workflow.steps[2].inputs, {
      runId: { from: "steps.check.result.runId" },
      headSha: { from: "steps.check.result.headSha" },
      runUrl: { from: "steps.check.result.runUrl" },
      failedChecks: { from: "steps.check.result.failedChecks" },
      failureLog: { from: "steps.check.result.failureLog" },
      failure: { from: "steps.check.result.failure" },
    });
    assert.deepEqual(workflow.steps[2].next, [
      { to: "finalize", when: { "lastOutcome.type": "RUN_FAILED" } },
      { to: "check-pr", default: true },
    ]);
    assert.deepEqual(workflow.steps[1].next[1], {
      to: "fix",
      when: { "result.hasOpenPr": true },
    });
    assert.equal(workflow.steps[3].targetFact, undefined);
    assert.equal(workflow.steps[3].delivery, "pull-request");
    assert.deepEqual(workflow.steps[3].inputs, {
      runId: { from: "workflow.facts.runId" },
      headSha: { from: "workflow.facts.headSha" },
      runUrl: { from: "workflow.facts.runUrl" },
      failedChecks: { from: "workflow.facts.failedChecks" },
      failureLog: { from: "workflow.facts.failureLog" },
      failure: { from: "workflow.facts.failure" },
    });
    assert.deepEqual(workflow.steps[3].next, [{ to: "check-pr" }]);
    assert.equal(workflow.steps[4].targetFact, undefined);
    assert.deepEqual(workflow.steps[4].inputs, {
      previousFailureFingerprint: { from: "workflow.facts.failureFingerprint" },
    });
    assert.deepEqual(workflow.steps[4].next, [
      { to: "finalize", when: { "result.repeatedFailure": true } },
      { to: "fix", when: { "result.needsRepair": true }, maxIterations: 8 },
      { to: "finalize", default: true },
    ]);
    assert.equal(
      workflow.steps.some((step) =>
        step.next?.some?.((transition) => transition.maxIterations),
      ),
      true,
    );
    assert.deepEqual(workflow.steps[5].inputs, {
      status: { from: "workflow.facts.status" },
      summary: { from: "workflow.facts.summary" },
      failedChecks: { from: "workflow.facts.failedChecks" },
    });
    assert.deepEqual(workflow.steps[6].inputs, {
      status: { from: "workflow.facts.status" },
      summary: { from: "workflow.facts.summary" },
      failedChecks: { from: "workflow.facts.failedChecks" },
      report: { from: "workflow.facts.report" },
    });

    const prepareContract = JSON.parse(
      await readFile(
        join(catalogCapabilities, "prepare-ci-repair", "contract.json"),
        "utf8",
      ),
    );
    assert.ok(prepareContract.output.required.includes("report"));

    const finalizeContract = JSON.parse(
      await readFile(
        join(catalogCapabilities, "finalize-ci-repair", "contract.json"),
        "utf8",
      ),
    );
    assert.equal(finalizeContract.execution, "script");
    assert.deepEqual(finalizeContract.output.required, [
      "status",
      "summary",
      "report",
    ]);

    const fixCiContract = JSON.parse(
      await readFile(join(catalogCapabilities, "fix-ci", "contract.json"), "utf8"),
    );
    assert.equal(fixCiContract.execution, "agent");
    assert.equal(fixCiContract.deliveryPolicy, "checkpoint");
    assert.equal(fixCiContract.input.properties.issue.type, "integer");
    assert.equal(fixCiContract.input.properties.pr.type, "integer");
    assert.equal(fixCiContract.input.properties.runId.type, "integer");
    assert.equal(fixCiContract.input.properties.headSha.type, "string");
    assert.equal(fixCiContract.input.properties.runUrl.type, "string");
    assert.equal(fixCiContract.input.properties.failureLog.type, "string");
    assert.equal(fixCiContract.input.properties.failure.type, "object");
    assert.deepEqual(fixCiContract.input.required, [
      "runId",
      "headSha",
      "failure",
    ]);
    assert.deepEqual(fixCiContract.output.required, [
      "status",
      "summary",
      "report",
    ]);
    assert.deepEqual(
      fixCiContract.output.properties.report.required,
      [
        "whatFailed",
        "likelyCause",
        "whatItTried",
        "whyStopped",
        "recommendedNextAction",
      ],
    );

    const fixCiInstructions = await readFile(
      join(catalogCapabilities, "fix-ci", "instructions.md"),
      "utf8",
    );
    assert.match(fixCiInstructions, /inspect that exact run/i);
    assert.match(fixCiInstructions, /issue or pull request/i);
    assert.match(fixCiInstructions, /failure\.log.*only failure/is);
    assert.match(fixCiInstructions, /make the smallest root-cause edit/i);
    assert.match(fixCiInstructions, /do not merge or sync/i);
    assert.match(fixCiInstructions, /whatFailed/);
    assert.match(fixCiInstructions, /recommendedNextAction/);
    assert.match(
      fixCiInstructions,
      /do not use `git log` or\s+`git show`/i,
    );

    const fixContract = JSON.parse(
      await readFile(join(catalogCapabilities, "fix", "contract.json"), "utf8"),
    );
    for (const ciOnlyField of [
      "runId",
      "headSha",
      "runUrl",
      "failedChecks",
      "failureLog",
    ]) {
      assert.equal(
        Object.hasOwn(fixContract.input.properties, ciOnlyField),
        false,
        `generic fix must not own CI-only field ${ciOnlyField}`,
      );
    }
  });

  it("does not point a Capability at the wrong target kind", async () => {
    const workflowEntries = await readdir(catalogWorkflows, { withFileTypes: true });

    for (const entry of workflowEntries.filter((item) => item.isDirectory())) {
      const workflow = JSON.parse(
        await readFile(join(catalogWorkflows, entry.name, "workflow.json"), "utf8"),
      );
      for (const step of workflow.steps ?? []) {
        if (step.target !== "pr" && step.target !== "issue") continue;
        if (engineBuiltins.has(step.capability)) continue;
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
    for (const slug of ["fix"]) {
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

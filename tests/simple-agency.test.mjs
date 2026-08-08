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
      const entries = await readdir(
        join(root, "capabilities", capability.name),
        {
          withFileTypes: true,
        },
      );
      const names = entries.map((entry) => entry.name).sort();
      assert.ok(
        names.every((name) =>
          ["contract.json", "instructions.md", "skills", "tools"].includes(
            name,
          ),
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
        const byId = new Map(
          (value.steps ?? []).map((step) => [step.id, step]),
        );
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

  it("ships the documentation agency as one lead with three private specialists", async () => {
    const workflow = JSON.parse(
      await readFile(
        join(root, "workflows", "documentation-agency", "workflow.json"),
        "utf8",
      ),
    );
    assert.equal(workflow.agent, "documentation-lead");
    assert.deepEqual(workflow.inputSchema, {
      type: "object",
      properties: {
        issue: {
          type: "integer",
          minimum: 1,
          description:
            "GitHub issue used as the evidence, approval, and repository-delivery anchor.",
        },
        brief: {
          type: "object",
          description:
            "Business questions that define the document before research and writing begin.",
          properties: {
            subject: {
              type: "string",
              minLength: 1,
              description:
                "The business, product, feature, or process to document.",
            },
            audience: {
              type: "string",
              minLength: 1,
              description: "The people who will use the document.",
            },
            desiredOutcome: {
              type: "string",
              minLength: 1,
              description: "What readers must understand, decide, or complete.",
            },
            documentType: {
              type: "string",
              minLength: 1,
              description:
                "The requested guide, policy, handbook, reference, or other document.",
            },
            authoritativeSources: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1 },
              description:
                "Sources whose facts may be treated as authoritative.",
            },
            destination: {
              type: "string",
              minLength: 1,
              description:
                "The approved repository or CMS publishing location.",
            },
          },
          required: [
            "subject",
            "audience",
            "desiredOutcome",
            "documentType",
            "authoritativeSources",
            "destination",
          ],
          additionalProperties: false,
        },
      },
      required: ["issue", "brief"],
      additionalProperties: false,
    });
    assert.deepEqual(workflow.capabilities, [
      "define-documentation-brief",
      "collect-documentation-evidence",
      "design-documentation-set",
      "documentation-draft",
      "test-documentation-examples",
      "verify-documentation-accuracy",
      "review-documentation-quality",
      "revise-documentation",
      "publish-documentation",
      "verify-published-documentation",
    ]);

    const briefInstructions = await readFile(
      join(
        root,
        "capabilities",
        "define-documentation-brief",
        "instructions.md",
      ),
      "utf8",
    );
    assert.match(briefInstructions, /current consumer repository/i);
    assert.match(briefInstructions, /GITHUB_REPOSITORY/);
    assert.match(briefInstructions, /Do not infer the issue repository/i);

    for (const capability of [
      "define-documentation-brief",
      "collect-documentation-evidence",
    ]) {
      const researcherContract = JSON.parse(
        await readFile(
          join(root, "capabilities", capability, "contract.json"),
          "utf8",
        ),
      );
      assert.deepEqual(researcherContract.requiredSubagents, [
        "documentation-researcher",
      ]);
    }

    const privateAgents = await readdir(
      join(root, "capabilities", "documentation-draft", "tools", "agents"),
    );
    assert.deepEqual(privateAgents.sort(), [
      "documentation-researcher.md",
      "documentation-reviewer.md",
      "documentation-writer.md",
    ]);

    const contract = JSON.parse(
      await readFile(
        join(root, "capabilities", "documentation-draft", "contract.json"),
        "utf8",
      ),
    );
    assert.equal(contract.execution, "agent");
    assert.deepEqual(contract.input.required, ["issue"]);
    assert.deepEqual(contract.output.properties.status.enum, ["pass", "blocked"]);
    assert.deepEqual(contract.output.required, [
      "version",
      "status",
      "summary",
      "title",
      "document",
      "source_evidence",
      "review_notes",
    ]);
  });

  it("ships the complete eleven-capability documentation operation", async () => {
    const capabilityNames = [
      "define-documentation-brief",
      "collect-documentation-evidence",
      "design-documentation-set",
      "documentation-draft",
      "test-documentation-examples",
      "verify-documentation-accuracy",
      "review-documentation-quality",
      "revise-documentation",
      "publish-documentation",
      "verify-published-documentation",
      "detect-documentation-drift",
    ];

    for (const capability of capabilityNames) {
      const contract = JSON.parse(
        await readFile(
          join(root, "capabilities", capability, "contract.json"),
          "utf8",
        ),
      );
      assert.equal(contract.execution, "agent");
      assert.equal(contract.input.type, "object");
      assert.equal(contract.output.type, "object");
      assert.equal(contract.output.additionalProperties, false);
      assert.ok(contract.output.required.length > 0);
      for (const field of ["version", "status", "summary"]) {
        assert.ok(
          contract.output.required.includes(field),
          `${capability} must return the standard Engine result field ${field}`,
        );
      }
      assert.equal(contract.output.properties.version.const, 1);
      assert.ok(
        contract.output.properties.status.enum.every((status) =>
          ["pass", "fail", "blocked", "changed", "noop"].includes(status),
        ),
        `${capability} must use only standard Engine statuses`,
      );
    }
  });

  it("keeps creation and maintenance as separate documentation workflows", async () => {
    const workflow = JSON.parse(
      await readFile(
        join(root, "workflows", "documentation-agency", "workflow.json"),
        "utf8",
      ),
    );
    const byId = new Map(workflow.steps.map((step) => [step.id, step]));
    for (const step of workflow.steps) {
      assert.equal(
        Object.hasOwn(step, "input"),
        false,
        `${step.id} must receive the cumulative workflow context`,
      );
    }
    for (const step of workflow.steps.slice(1)) {
      const contract = JSON.parse(
        await readFile(
          join(root, "capabilities", step.capability, "contract.json"),
          "utf8",
        ),
      );
      assert.equal(
        contract.input.additionalProperties,
        true,
        `${step.id} must accept prior workflow artifacts`,
      );
    }
    for (const capability of [
      "test-documentation-examples",
      "verify-documentation-accuracy",
      "review-documentation-quality",
      "revise-documentation",
      "publish-documentation",
    ]) {
      const contract = JSON.parse(
        await readFile(
          join(root, "capabilities", capability, "contract.json"),
          "utf8",
        ),
      );
      assert.ok(
        contract.input.required.includes("document"),
        `${capability} must require the draft artifact`,
      );
    }
    assert.equal(workflow.startAt, "brief");
    assert.equal(byId.get("brief").next, "evidence");
    assert.equal(byId.get("evidence").next, "design");
    assert.equal(byId.get("design").next, "draft");
    assert.deepEqual(byId.get("draft").next, [
      { to: "examples", when: { "result.status": "pass" } },
    ]);
    assert.deepEqual(byId.get("examples").next, [
      { to: "accuracy", when: { "result.status": "pass" } },
      { to: "accuracy", when: { "result.status": "changed" } },
    ]);
    assert.deepEqual(byId.get("accuracy").next, [
      { to: "quality", when: { "result.status": "pass" } },
      { to: "quality", when: { "result.status": "changed" } },
    ]);
    assert.deepEqual(byId.get("quality").next, [
      { to: "publish", when: { "result.status": "pass" } },
      { to: "revise", when: { "result.status": "changed" }, maxIterations: 3 },
    ]);
    assert.deepEqual(byId.get("revise").next, [
      { to: "examples", default: true, maxIterations: 3 },
    ]);
    assert.deepEqual(byId.get("publish").next, [
      { to: "verify-published", when: { "result.status": "pass" } },
      { to: "$end", default: true },
    ]);
    assert.equal(byId.get("publish").delivery, "pull-request");

    const maintenance = JSON.parse(
      await readFile(
        join(root, "workflows", "maintain-documentation", "workflow.json"),
        "utf8",
      ),
    );
    assert.equal(maintenance.agent, "documentation-lead");
    assert.equal(maintenance.startAt, "detect-drift");
    assert.deepEqual(maintenance.capabilities, ["detect-documentation-drift"]);
    assert.equal(maintenance.steps[0].capability, "detect-documentation-drift");

    const loop = JSON.parse(
      await readFile(
        join(root, "loops", "documentation-maintenance", "loop.json"),
        "utf8",
      ),
    );
    assert.deepEqual(loop.target, {
      kind: "workflow",
      id: "maintain-documentation",
    });
    assert.deepEqual(loop.trigger, { type: "schedule", every: "7d" });
    assert.equal(loop.enabled, true);
  });

  it("keeps one canonical draft and blocks unresolved review loops", async () => {
    const workflow = JSON.parse(
      await readFile(
        join(root, "workflows", "documentation-agency", "workflow.json"),
        "utf8",
      ),
    );
    const byId = new Map(workflow.steps.map((step) => [step.id, step]));

    for (const stepId of ["draft", "examples", "accuracy", "quality"]) {
      assert.equal(
        byId.get(stepId).next.some((transition) => transition.default === true),
        false,
        `${stepId} must block when its result has no available transition`,
      );
    }
    const incomingRevisionLimit = ["quality"]
      .flatMap((stepId) => byId.get(stepId).next)
      .filter((transition) => transition.to === "revise")
      .reduce((total, transition) => total + transition.maxIterations, 0);
    assert.equal(
      byId.get("revise").next[0].maxIterations,
      incomingRevisionLimit,
    );

    for (const capability of [
      "documentation-draft",
      "test-documentation-examples",
      "verify-documentation-accuracy",
      "review-documentation-quality",
      "revise-documentation",
    ]) {
      const instructions = await readFile(
        join(root, "capabilities", capability, "instructions.md"),
        "utf8",
      );
      assert.match(
        instructions,
        /`input\.document` is the canonical draft/i,
        `${capability} must preserve the workflow-context draft`,
      );
      assert.match(
        instructions,
        /do\s+not\s+read or write the destination/i,
        `${capability} must not substitute a repository destination file`,
      );
      assert.match(
        instructions,
        /do\s+not\s+require exact line-number ranges for hydrated or generated files/i,
        `${capability} must use stable evidence references`,
      );
    }
  });

  it("keeps documentation reviews reliable and reader-focused", async () => {
    const accuracyInstructions = await readFile(
      join(
        root,
        "capabilities",
        "verify-documentation-accuracy",
        "instructions.md",
      ),
      "utf8",
    );
    assert.match(
      accuracyInstructions,
      /provide the specialist with the complete,\s+exact `input\.document`/i,
    );
    assert.match(
      accuracyInstructions,
      /never replace\s+it with a summary, excerpt, or\s+placeholder/i,
    );
    assert.match(
      accuracyInstructions,
      /do not restart an open-ended audit/i,
    );

    const reviewInstructions = await readFile(
      join(
        root,
        "capabilities",
        "review-documentation-quality",
        "instructions.md",
      ),
      "utf8",
    );
    assert.match(
      reviewInstructions,
      /If the\s+specialist is unavailable or is not actually invoked, perform the review\s+directly/i,
    );
    assert.match(
      reviewInstructions,
      /Do not stop after announcing or planning a specialist invocation/i,
    );
    assert.match(
      reviewInstructions,
      /Return exactly one JSON object matching the capability contract/i,
    );
    assert.match(
      reviewInstructions,
      /combine all actionable example, accuracy, and quality findings/i,
    );
    assert.match(
      reviewInstructions,
      /complete the quality review even when an earlier check returned `changed`/i,
    );
    assert.match(
      reviewInstructions,
      /provide the specialist with the complete,\s+exact `input\.document`/i,
    );
    assert.match(
      reviewInstructions,
      /never replace\s+it with a summary, excerpt, or\s+placeholder/i,
    );

    const reviseInstructions = await readFile(
      join(
        root,
        "capabilities",
        "revise-documentation",
        "instructions.md",
      ),
      "utf8",
    );
    assert.match(
      reviseInstructions,
      /apply the combined findings in\s+one revision/i,
    );

    const draftInstructions = await readFile(
      join(root, "capabilities", "documentation-draft", "instructions.md"),
      "utf8",
    );
    assert.match(
      draftInstructions,
      /match the document's depth to the requested document type and desired outcome/i,
    );
    assert.match(
      draftInstructions,
      /For a practical usage guide, prefer roughly 150 to 250 lines/i,
    );
    assert.match(
      draftInstructions,
      /Exclude internal implementation detail\s+and unrelated workflows/i,
    );
    assert.match(
      draftInstructions,
      /Use the supplied brief, evidence, and document design/i,
    );
    assert.match(draftInstructions, /Invoke `documentation-writer`/i);
    assert.doesNotMatch(
      draftInstructions,
      /Invoke `documentation-researcher`/i,
    );
    assert.doesNotMatch(draftInstructions, /Invoke `documentation-reviewer`/i);
  });

  it("keeps example testing separate from accuracy and quality review", async () => {
    const exampleInstructions = await readFile(
      join(
        root,
        "capabilities",
        "test-documentation-examples",
        "instructions.md",
      ),
      "utf8",
    );

    assert.match(
      exampleInstructions,
      /Limit the review to commands, code samples, API examples, procedural\s+steps, and links required by those procedures/i,
    );
    assert.match(
      exampleInstructions,
      /Do not review general prose, source attribution, document-wide factual\s+accuracy, writing quality, or navigation outside a tested procedure/i,
    );
    assert.match(
      exampleInstructions,
      /Report all reproducible example and procedure defects together in one\s+result/i,
    );
    assert.match(
      exampleInstructions,
      /Leave\s+factual review to `verify-documentation-accuracy` and reader-facing quality\s+review to `review-documentation-quality`/i,
    );
  });

  it("supports complete, focused operating guides written for AI agents", async () => {
    const capabilityInstructions = {};
    for (const capability of [
      "design-documentation-set",
      "documentation-draft",
      "test-documentation-examples",
      "review-documentation-quality",
    ]) {
      capabilityInstructions[capability] = await readFile(
        join(root, "capabilities", capability, "instructions.md"),
        "utf8",
      );
    }

    assert.match(
      capabilityInstructions["design-documentation-set"],
      /AI operating guide/i,
    );
    assert.match(
      capabilityInstructions["design-documentation-set"],
      /inputs, available actions, decision rules, ordered procedures, expected\s+outputs, safety limits, and failure handling/i,
    );
    assert.match(
      capabilityInstructions["design-documentation-set"],
      /one operating procedure and one compact input\/output contract section/i,
    );
    assert.match(
      capabilityInstructions["design-documentation-set"],
      /Do not repeat either section in an appendix/i,
    );
    assert.match(
      capabilityInstructions["design-documentation-set"],
      /require one verified invocation mechanism/i,
    );
    assert.match(
      capabilityInstructions["design-documentation-set"],
      /Return `blocked` when no verified invocation mechanism is available/i,
    );
    assert.match(
      capabilityInstructions["documentation-draft"],
      /write for the AI agent as the direct operator/i,
    );
    assert.match(
      capabilityInstructions["documentation-draft"],
      /Do not add human onboarding, background narrative, persuasion, or\s+commentary/i,
    );
    assert.match(
      capabilityInstructions["documentation-draft"],
      /Do not use a hard\s+line, page, or word limit/i,
    );
    assert.match(
      capabilityInstructions["documentation-draft"],
      /Use placeholders for run-specific values/i,
    );
    assert.match(
      capabilityInstructions["documentation-draft"],
      /The workflow engine owns capability sequencing/i,
    );
    assert.match(
      capabilityInstructions["documentation-draft"],
      /Include exactly one verified invocation example/i,
    );
    assert.match(
      capabilityInstructions["test-documentation-examples"],
      /AI prompts, tool calls, structured inputs,\s+expected outputs, and decision procedures/i,
    );
    assert.match(
      capabilityInstructions["review-documentation-quality"],
      /can operate the\s+documented system without guessing/i,
    );
    assert.match(
      capabilityInstructions["review-documentation-quality"],
      /Length\s+alone is not a defect/i,
    );
    assert.match(
      capabilityInstructions["review-documentation-quality"],
      /repeats a procedure or contract/i,
    );
    assert.match(
      capabilityInstructions["review-documentation-quality"],
      /does\s+not provide a verified invocation mechanism/i,
    );

    const reviseInstructions = await readFile(
      join(
        root,
        "capabilities",
        "revise-documentation",
        "instructions.md",
      ),
      "utf8",
    );
    assert.match(
      reviseInstructions,
      /replace outdated text instead of appending\s+corrections/i,
    );
    assert.match(
      reviseInstructions,
      /retain any detail required for safe and successful operation/i,
    );
  });

  it("blocks publication without explicit approval and keeps maintenance read-only", async () => {
    const publish = await readFile(
      join(root, "capabilities", "publish-documentation", "instructions.md"),
      "utf8",
    );
    assert.match(publish, /explicit human approval/i);
    assert.match(publish, /Create or update only/i);
    assert.match(publish, /Never delete/i);
    assert.match(publish, /return `changed`/i);
    assert.match(publish, /delivery wrapper/i);
    assert.match(publish, /\"status\": \"blocked\"/);

    const maintenance = await readFile(
      join(
        root,
        "capabilities",
        "detect-documentation-drift",
        "instructions.md",
      ),
      "utf8",
    );
    assert.match(maintenance, /read-only/i);
    assert.match(maintenance, /do not rewrite/i);
  });

  it("keeps CI repair focused on CI and publishes reusable review-and-merge", async () => {
    const ciRepair = JSON.parse(
      await readFile(
        join(root, "workflows", "ci-repair", "workflow.json"),
        "utf8",
      ),
    );
    const byId = new Map(ciRepair.steps.map((step) => [step.id, step]));

    const healthContract = JSON.parse(
      await readFile(
        join(root, "capabilities", "ci-health-check", "contract.json"),
        "utf8",
      ),
    );
    assert.equal(healthContract.execution, "script");

    assert.equal(byId.get("repair").next, "check-pr");
    assert.deepEqual(byId.get("check").next[0], {
      to: "prepare",
      when: { "result.needsRepair": true },
    });
    assert.deepEqual(byId.get("prepare").next[0], {
      to: "$end",
      when: { "result.status": "blocked" },
    });
    assert.deepEqual(byId.get("prepare").next[1], {
      to: "check-pr",
      when: { "result.hasOpenPr": true },
    });
    assert.deepEqual(byId.get("prepare").next[2], {
      to: "repair",
      default: true,
    });
    assert.deepEqual(byId.get("check-pr").next, [
      { to: "fix", when: { "result.status": "red" } },
      { to: "$end", when: { "result.status": "blocked" } },
      { to: "$end", default: true },
    ]);
    assert.equal(byId.get("check-pr").targetFact, "pr");
    assert.equal(byId.has("review"), false);
    assert.equal(byId.has("merge"), false);
    assert.deepEqual(byId.get("fix").next, [
      { to: "$end", when: { "result.status": "blocked" } },
      { to: "check-pr", default: true, maxIterations: 3 },
    ]);

    const reviewMerge = JSON.parse(
      await readFile(
        join(root, "workflows", "review-merge", "workflow.json"),
        "utf8",
      ),
    );
    const reviewById = new Map(
      reviewMerge.steps.map((step) => [step.id, step]),
    );
    assert.deepEqual(reviewMerge.inputSchema.required, ["pr"]);
    assert.equal(reviewMerge.startAt, "review");
    assert.equal(reviewById.has("check-pr"), false);
    assert.equal(
      reviewMerge.steps.some(
        (step) => step.capability === "ci-health-check",
      ),
      false,
    );
    assert.deepEqual(reviewById.get("review").next, [
      { to: "ui-review", when: { "result.verdict": "pass" } },
      { to: "fix", when: { "result.verdict": "fix" } },
      { to: "$end", default: true },
    ]);
    assert.equal(reviewById.get("ui-review").target, "pr");
    assert.deepEqual(reviewById.get("ui-review").next, [
      { to: "merge", when: { "result.verdict": "pass" } },
      { to: "fix", when: { "result.verdict": "fix" } },
      { to: "$end", when: { "result.verdict": "blocked" } },
      { to: "$end", default: true },
    ]);
    assert.deepEqual(reviewById.get("fix").next, [
      { to: "$end", when: { "result.status": "blocked" } },
      { to: "review", default: true, maxIterations: 3 },
    ]);
    assert.equal(reviewById.get("fix").delivery, "pull-request");
    assert.equal(reviewById.get("merge").target, "pr");

    const uiReviewContract = JSON.parse(
      await readFile(
        join(root, "capabilities", "ui-review", "contract.json"),
        "utf8",
      ),
    );
    assert.equal(uiReviewContract.execution, "agent");
    assert.deepEqual(uiReviewContract.output.properties.verdict.enum, [
      "pass",
      "fix",
      "blocked",
    ]);
    assert.deepEqual(uiReviewContract.output.required, [
      "verdict",
      "feedback",
      "summary",
    ]);

    const uiReviewInstructions = await readFile(
      join(root, "capabilities", "ui-review", "instructions.md"),
      "utf8",
    );
    assert.match(uiReviewInstructions, /running app/i);
    assert.match(uiReviewInstructions, /Playwright/i);
    assert.match(uiReviewInstructions, /screenshot/i);
    assert.match(uiReviewInstructions, /loading/i);
    assert.match(uiReviewInstructions, /empty/i);
    assert.match(uiReviewInstructions, /error/i);
    assert.match(uiReviewInstructions, /mobile/i);
    assert.match(uiReviewInstructions, /keyboard/i);
    assert.match(uiReviewInstructions, /no UI surface/i);
    assert.match(uiReviewInstructions, /devServer\.command/);
    assert.match(uiReviewInstructions, /devServer\.url/);
    assert.match(uiReviewInstructions, /return `blocked`/i);
    assert.match(uiReviewInstructions, /environment problem is not code feedback/i);
    assert.doesNotMatch(uiReviewInstructions, /post ONE structured review comment/i);

    const solution = JSON.parse(
      await readFile(
        join(root, "solutions", "review-merge", "solution.json"),
        "utf8",
      ),
    );
    assert.deepEqual(solution.entrypoints, [
      { kind: "workflow", id: "review-merge" },
    ]);

    const healthInstructions = await readFile(
      join(root, "capabilities", "ci-health-check", "instructions.md"),
      "utf8",
    );
    assert.match(healthInstructions, /deterministic/i);
    assert.match(
      healthInstructions,
      /ignores\s+Kody's own orchestration workflow/i,
    );
    assert.match(healthInstructions, /pull request/i);
    assert.match(healthInstructions, /never creates repair state/i);

    const prepareInstructions = await readFile(
      join(root, "capabilities", "prepare-ci-repair", "instructions.md"),
      "utf8",
    );
    assert.match(prepareInstructions, /deterministic/i);
    assert.match(prepareInstructions, /does not inspect CI or change code/i);

    const fixInstructions = await readFile(
      join(root, "capabilities", "fix", "instructions.md"),
      "utf8",
    );
    assert.match(
      fixInstructions,
      /Always finish by returning exactly one JSON object/,
    );
    assert.match(fixInstructions, /merge the latest base branch/);
    assert.match(
      fixInstructions,
      /Do not run\s+the repository's full CI suite locally/,
    );
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
    const capabilities = new Set(workflow.steps.map((step) => step.capability));
    assert.deepEqual(
      capabilities,
      new Set([
        "release-prepare",
        "release-validate",
        "release-merge",
        "release-promote",
        "vercel-production-deploy",
      ]),
    );
    for (const capability of capabilities) {
      await readFile(
        join(root, "capabilities", capability, "instructions.md"),
        "utf8",
      );
    }

    await assert.rejects(
      readFile(
        join(warehouseRoot, "loops", "daily-web-release-loop", "loop.json"),
        "utf8",
      ),
      { code: "ENOENT" },
    );
  });

  it("ships the complete daily package release bundle in the active catalog", async () => {
    const loop = JSON.parse(
      await readFile(
        join(root, "loops", "daily-package-release-loop", "loop.json"),
        "utf8",
      ),
    );
    assert.deepEqual(loop.target, {
      kind: "workflow",
      id: "package-release",
    });

    const workflow = JSON.parse(
      await readFile(
        join(root, "workflows", "package-release", "workflow.json"),
        "utf8",
      ),
    );
    assert.equal(workflow.startAt, "prepare");
    assert.deepEqual(
      workflow.steps.map((step) => step.capability),
      ["release-prepare", "release-validate", "release-merge", "npm-publish"],
    );
    assert.equal(workflow.steps.at(-1).evidence, "packagePublished");
    for (const step of workflow.steps) {
      assert.equal(typeof step.id, "string");
      await readFile(
        join(root, "capabilities", step.capability, "instructions.md"),
        "utf8",
      );
    }
  });

  it("ships scheduled Test Health as its own repair-capable solution", async () => {
    const loop = JSON.parse(
      await readFile(
        join(root, "loops", "daily-test-health-loop", "loop.json"),
        "utf8",
      ),
    );
    assert.deepEqual(loop.target, { kind: "workflow", id: "test-health" });
    assert.equal(loop.trigger.every, "1d");
    assert.equal(loop.enabled, false);

    const workflow = JSON.parse(
      await readFile(
        join(root, "workflows", "test-health", "workflow.json"),
        "utf8",
      ),
    );
    const byId = new Map(workflow.steps.map((step) => [step.id, step]));
    assert.equal(workflow.startAt, "check");
    assert.deepEqual(byId.get("check").next, [
      { to: "repair", when: { "result.needsRepair": true } },
      { to: "$end", default: true },
    ]);
    assert.equal(byId.get("repair").capability, "run");
    assert.equal(byId.get("repair").delivery, "pull-request");
    assert.equal(byId.get("repair").next, "check-pr");
    assert.equal(byId.get("check-pr").capability, "ci-health-check");
    assert.deepEqual(byId.get("fix").next, [
      { to: "$end", when: { "result.status": "blocked" } },
      { to: "check-pr", default: true, maxIterations: 3 },
    ]);
    assert.equal(byId.get("review").capability, "review");
    assert.equal(byId.get("merge").capability, "merge");

    const solution = JSON.parse(
      await readFile(
        join(root, "solutions", "test-health", "solution.json"),
        "utf8",
      ),
    );
    assert.deepEqual(solution.entrypoints, [
      { kind: "loop", id: "daily-test-health-loop" },
    ]);
  });

  it("publishes management loops through workflows without duplicating capabilities", async () => {
    const bundles = {
      "agency-observer": [
        "repo-source-health",
        "observe-repo-ci",
        "observe-agency-flow",
      ],
      "agency-operating-loop": ["operate-findings"],
      "agency-evolution-loop": ["agency-portfolio-management"],
      "agency-operations-loop": ["agency-operations-management"],
      "ai-agency-health": ["ai-agency-health-matrix"],
      "company-growth-loop": ["company-portfolio-management"],
    };

    for (const [loopId, expectedCapabilities] of Object.entries(bundles)) {
      const loop = JSON.parse(
        await readFile(join(root, "loops", loopId, "loop.json"), "utf8"),
      );
      assert.deepEqual(loop.target, { kind: "workflow", id: loopId });

      const workflow = JSON.parse(
        await readFile(
          join(root, "workflows", loopId, "workflow.json"),
          "utf8",
        ),
      );
      assert.deepEqual(
        workflow.steps.map((step) => step.capability),
        expectedCapabilities,
      );

      for (const capability of expectedCapabilities) {
        await readFile(
          join(root, "capabilities", capability, "instructions.md"),
          "utf8",
        );
        await assert.rejects(
          readFile(
            join(warehouseRoot, "capabilities", capability, "instructions.md"),
            "utf8",
          ),
          { code: "ENOENT" },
        );
      }
    }

    const goalFreeFiles = [
      join(
        root,
        "capabilities",
        "agency-operations-management",
        "skills",
        "agency-operations-management",
        "SKILL.md",
      ),
      join(
        root,
        "capabilities",
        "agency-portfolio-management",
        "skills",
        "agency-portfolio-management",
        "SKILL.md",
      ),
      join(
        root,
        "capabilities",
        "operate-findings",
        "tools",
        "scripts",
        "load-agency-findings.sh",
      ),
    ];
    for (const file of goalFreeFiles) {
      assert.doesNotMatch(await readFile(file, "utf8"), /\bgoals?\b/i);
    }
    await assert.rejects(
      readFile(
        join(
          root,
          "capabilities",
          "ai-agency-health-matrix",
          "tools",
          "scripts",
          "run-ai-agency-health-matrix.sh",
        ),
        "utf8",
      ),
      { code: "ENOENT" },
    );
  });

  it("keeps the active catalog separate from the warehouse", async () => {
    const roots = await readdir(root);
    assert.deepEqual(roots.sort(), [
      "capabilities",
      "loops",
      "solutions",
      "workflows",
    ]);
    const loop = JSON.parse(
      await readFile(join(root, "loops", "ci-repair", "loop.json"), "utf8"),
    );
    assert.deepEqual(loop.target, { kind: "workflow", id: "ci-repair" });
    assert.deepEqual(loop.trigger, { type: "schedule", every: "15m" });
  });
});

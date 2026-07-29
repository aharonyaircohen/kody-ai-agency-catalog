import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const capabilityRoot = join(
  root,
  "catalog/capabilities/build-chat-knowledge-graph",
);
const workflowPath = join(
  root,
  "catalog/workflows/build-chat-knowledge-graph/workflow.json",
);
const retiredCatalogPaths = [
  "catalog/capabilities/build-knowledge-graph",
  "catalog/capabilities/create-knowledge-report",
  "catalog/capabilities/link-knowledge-graphs",
  "catalog/capabilities/publish-knowledge-system",
  "catalog/capabilities/verify-knowledge-system",
  "catalog/loops/knowledge-system-refresh",
  "catalog/workflows/refresh-knowledge-system",
];
const retiredGraphifyPaths = [
  "warehouse/capabilities/build-knowledge-graph",
  "warehouse/capabilities/create-knowledge-report",
  "warehouse/capabilities/link-knowledge-graphs",
  "warehouse/capabilities/publish-knowledge-system",
  "warehouse/capabilities/verify-knowledge-system",
  "warehouse/loops/knowledge-system-refresh",
  "warehouse/workflows/assess-delivery",
  "warehouse/workflows/assess-repository",
  "warehouse/workflows/refresh-knowledge-system",
];

describe("Chat knowledge graph definition", () => {
  it("keeps the standard question set inside the capability skill", async () => {
    const skill = await readFile(
      join(capabilityRoot, "skills/company-understanding/SKILL.md"),
      "utf8",
    );
    const questionIds = [
      ...skill.matchAll(/^### (CB|PJ|RT|DA|WC|AA)-\d{2}:/gm),
    ].map((match) => match[0]);

    assert.equal(questionIds.length, 30);
    for (const group of ["CB", "PJ", "RT", "DA", "WC", "AA"]) {
      assert.equal(
        questionIds.filter((questionId) =>
          questionId.startsWith(`### ${group}-`),
        ).length,
        5,
      );
    }
    assert.match(skill, /up to ten company-specific questions/i);
    assert.match(skill, /one connected graph/i);
    assert.match(skill, /source evidence/i);
  });

  it("declares a bounded, evidence-backed graph result", async () => {
    const contract = JSON.parse(
      await readFile(join(capabilityRoot, "contract.json"), "utf8"),
    );

    assert.equal(contract.execution, "agent");
    assert.equal(contract.input.properties.companyQuestions.maxItems, 10);
    assert.deepEqual(contract.output.required, [
      "schemaVersion",
      "kind",
      "status",
      "summary",
      "graph",
      "sources",
      "coverage",
      "gaps",
    ]);
    assert.deepEqual(contract.output.properties.graph.required, [
      "nodes",
      "edges",
    ]);
    assert.deepEqual(
      contract.output.properties.graph.properties.nodes.items.required,
      ["id", "type", "label", "summary", "sourceIds"],
    );
    assert.deepEqual(
      contract.output.properties.graph.properties.edges.items.required,
      ["source", "target", "relation", "sourceIds"],
    );
    assert.deepEqual(contract.output.properties.sources.items.required, [
      "id",
      "kind",
      "locator",
      "observedAt",
      "evidence",
    ]);
    assert.deepEqual(contract.output.properties.coverage.items.required, [
      "questionId",
      "status",
      "sourceIds",
    ]);
    const instructions = await readFile(
      join(capabilityRoot, "instructions.md"),
      "utf8",
    );
    assert.match(instructions, /final response must contain only the raw JSON object/i);
  });

  it("builds knowledge before publishing its data as a disabled Chat tool", async () => {
    const workflow = JSON.parse(await readFile(workflowPath, "utf8"));

    assert.equal(workflow.agent, "kody");
    assert.equal(workflow.startAt, "build");
    assert.deepEqual(workflow.steps, [
      {
        id: "build",
        capability: "build-chat-knowledge-graph",
        input: {},
        next: "publish",
      },
      {
        id: "publish",
        capability: "publish-chat-knowledge-tool",
      },
    ]);
    const publishContract = JSON.parse(
      await readFile(
        join(
          root,
          "catalog/capabilities/publish-chat-knowledge-tool/contract.json",
        ),
        "utf8",
      ),
    );
    assert.equal(publishContract.execution, "script");
    assert.equal(
      publishContract.output.properties.toolId.const,
      "company-understanding",
    );
  });

  it("removes the retired active Knowledge System definitions", async () => {
    for (const path of retiredCatalogPaths) {
      await assert.rejects(access(join(root, path)));
    }
  });

  it("removes the retired Graphify pipeline without removing CodeGraph", async () => {
    for (const path of retiredGraphifyPaths) {
      await assert.rejects(access(join(root, path)));
    }

    const codebaseHealth = JSON.parse(
      await readFile(
        join(root, "warehouse/workflows/codebase-health/workflow.json"),
        "utf8",
      ),
    );
    assert.equal(
      codebaseHealth.steps.some(
        (step) => step.capability === "build-knowledge-graph",
      ),
      false,
    );

    const storeDefinitions = await readTextTree(join(root, "catalog"));
    const warehouseDefinitions = await readTextTree(join(root, "warehouse"));
    assert.doesNotMatch(
      `${storeDefinitions}\n${warehouseDefinitions}`,
      /graphify/i,
    );
    await access(
      join(
        root,
        "catalog/capabilities/review/tools/scripts/install-codegraph.sh",
      ),
    );
  });
});

async function readTextTree(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map((entry) => {
      const child = join(path, entry.name);
      return entry.isDirectory()
        ? readTextTree(child)
        : readFile(child, "utf8");
    }),
  );
  return contents.join("\n");
}

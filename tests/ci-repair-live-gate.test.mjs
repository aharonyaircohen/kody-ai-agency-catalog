import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runCiRepairRepeatabilityGate } from "../scripts/lib/ci-repair-live-gate.mjs";

const originalSource = `export function capitalizeWords(value) {
  return value.toUpperCase()
}
`;

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fixture({ blocked = false, duplicate = false } = {}) {
  let source = originalSource;
  let mainSha = "healthy-0";
  let cycle = 0;
  const writes = [];
  const pipelineRuns = [];
  let dashboardPostCount = 0;

  return {
    writes,
    get dashboardPostCount() {
      return dashboardPostCount;
    },
    get source() {
      return source;
    },
    dependencies: {
      sleep: async () => undefined,
      fetch: async (url, init = {}) => {
        const method = init.method || "GET";
        const path = new URL(url).pathname;
        if (path.endsWith("/contents/src/utils/capitalize-words.ts")) {
          if (method === "GET") {
            return response({
              sha: mainSha,
              content: Buffer.from(source).toString("base64"),
            });
          }
          const body = JSON.parse(init.body);
          source = Buffer.from(body.content, "base64").toString("utf8");
          cycle += 1;
          mainSha = source === originalSource ? `restored-${cycle}` : `broken-${cycle}`;
          writes.push({ source, message: body.message });
          return response({ commit: { sha: mainSha } });
        }
        if (path.endsWith("/actions/workflows/test-ci.yml/runs")) {
          return response({
            workflow_runs: [
              {
                id: 800 + cycle,
                head_sha: mainSha,
                status: "completed",
                conclusion: mainSha.startsWith("broken-") ? "failure" : "success",
                html_url: `https://github.test/runs/${800 + cycle}`,
              },
            ],
          });
        }
        if (path.endsWith("/company/pipelines/ci-repair/run")) {
          dashboardPostCount += 1;
          throw new Error("The live gate must observe the automatic trigger");
        }
        if (path.endsWith("/company/pipelines/ci-repair/runs")) {
          if (
            mainSha.startsWith("broken-") &&
            !pipelineRuns.some((run) => run.runId === `run-trigger-${cycle}`)
          ) {
            pipelineRuns.unshift({
              runId: `run-trigger-${cycle}`,
              status: blocked ? "blocked" : "done",
              facts: {
                branch: "main",
                ciRunId: 800 + cycle,
                headSha: mainSha,
                pr: 100 + cycle,
              },
              steps: [
                { id: "ci-repair", status: blocked ? "blocked" : "done" },
                { id: "review-and-fix", status: blocked ? "pending" : "done" },
                { id: "merge", status: blocked ? "pending" : "done" },
              ],
            });
            if (duplicate) {
              pipelineRuns.unshift({
                runId: `run-trigger-duplicate-${cycle}`,
                status: "running",
                facts: {
                  branch: "main",
                  ciRunId: 900 + cycle,
                  headSha: `follow-up-${cycle}`,
                },
                steps: [
                  { id: "ci-repair", status: "running" },
                  { id: "review-and-fix", status: "pending" },
                  { id: "merge", status: "pending" },
                ],
              });
            }
            if (!blocked) {
              source = originalSource;
              mainSha = `repaired-${cycle}`;
            }
          }
          return response({ runs: pipelineRuns });
        }
        if (path.endsWith("/branches/main")) {
          return response({ commit: { sha: mainSha } });
        }
        const pull = path.match(/\/pulls\/(\d+)$/);
        if (pull) {
          return response({
            number: Number(pull[1]),
            merged: true,
            head: { ref: `repair-cycle-${cycle}` },
          });
        }
        throw new Error(`Unexpected request: ${method} ${url}`);
      },
    },
  };
}

const config = {
  dashboardUrl: "https://dashboard.test",
  githubToken: "test-token",
  owner: "aharonyaircohen",
  repo: "Kody-Engine-Tester",
  sourcePath: "src/utils/capitalize-words.ts",
  workflowFile: "test-ci.yml",
  pipelineId: "ci-repair",
  cycles: 2,
  timeoutMs: 1_000,
  pollMs: 1,
};

describe("CI Repair live repeatability gate", () => {
  it("repairs two independent failures with fresh pull-request branches", async () => {
    const setup = fixture();

    const result = await runCiRepairRepeatabilityGate(
      config,
      setup.dependencies,
    );

    assert.deepEqual(
      result.cycles.map(({ pr, repairBranch }) => ({ pr, repairBranch })),
      [
        { pr: 101, repairBranch: "repair-cycle-1" },
        { pr: 102, repairBranch: "repair-cycle-2" },
      ],
    );
    assert.equal(setup.writes.length, 2);
    assert.equal(setup.dashboardPostCount, 0);
    assert.notEqual(result.cycles[0].repairBranch, result.cycles[1].repairBranch);
  });

  it("restores the original source when the repair pipeline blocks", async () => {
    const setup = fixture({ blocked: true });

    await assert.rejects(
      runCiRepairRepeatabilityGate(config, setup.dependencies),
      /ended as blocked/,
    );

    assert.equal(setup.writes.at(-1).source, originalSource);
    assert.match(setup.writes.at(-1).message, /restore tester fixture/i);
  });

  it("fails when one CI incident starts competing repair pipelines", async () => {
    const setup = fixture({ duplicate: true });

    await assert.rejects(
      runCiRepairRepeatabilityGate(config, setup.dependencies),
      /started competing repair pipelines/,
    );

    assert.equal(setup.source, originalSource);
  });
});

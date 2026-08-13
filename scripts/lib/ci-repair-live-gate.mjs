import { randomUUID } from "node:crypto";

const defaultDependencies = {
  fetch: globalThis.fetch,
  sleep: (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  createRunId: () => `run-ci-repair-gate-${randomUUID()}`,
};

export async function runCiRepairRepeatabilityGate(
  config,
  dependencies = defaultDependencies,
) {
  validateConfig(config);
  const githubBase = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  const dashboardBase = config.dashboardUrl.replace(/\/+$/, "");
  const githubHeaders = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${config.githubToken}`,
    "x-github-api-version": "2022-11-28",
  };
  const dashboardHeaders = {
    "content-type": "application/json",
    "x-kody-token": config.githubToken,
    "x-kody-owner": config.owner,
    "x-kody-repo": config.repo,
  };
  const original = await readSource(
    dependencies.fetch,
    githubBase,
    config.sourcePath,
    githubHeaders,
  );
  const cycles = [];

  try {
    for (let index = 0; index < config.cycles; index += 1) {
      const current = await readSource(
        dependencies.fetch,
        githubBase,
        config.sourcePath,
        githubHeaders,
      );
      const brokenSource = breakFixture(current.content);
      const pipelineRunId = dependencies.createRunId();
      const brokenSha = await writeSource(
        dependencies.fetch,
        githubBase,
        config.sourcePath,
        githubHeaders,
        current.sha,
        brokenSource,
        `test(ci-repair): start repeatability cycle ${index + 1}`,
      );
      const failedRun = await waitForWorkflowRun({
        dependencies,
        url: `${githubBase}/actions/workflows/${encodeURIComponent(config.workflowFile)}/runs?branch=main&event=push&per_page=20`,
        headers: githubHeaders,
        headSha: brokenSha,
        conclusion: "failure",
        timeoutMs: config.timeoutMs,
        pollMs: config.pollMs,
      });

      await requestJson(
        dependencies.fetch,
        `${dashboardBase}/api/kody/company/pipelines/${encodeURIComponent(config.pipelineId)}/run`,
        {
          method: "POST",
          headers: dashboardHeaders,
          body: JSON.stringify({
            runId: pipelineRunId,
            input: {
              branch: "main",
              ciRunId: failedRun.id,
              headSha: brokenSha,
            },
          }),
        },
      );
      const pipeline = await waitForPipeline({
        dependencies,
        url: `${dashboardBase}/api/kody/company/pipelines/${encodeURIComponent(config.pipelineId)}/runs`,
        headers: dashboardHeaders,
        runId: pipelineRunId,
        timeoutMs: config.timeoutMs,
        pollMs: config.pollMs,
      });
      if (pipeline.status !== "done") {
        throw new Error(
          `CI Repair pipeline ${pipelineRunId} ended as ${pipeline.status}${pipeline.error ? `: ${pipeline.error}` : ""}`,
        );
      }
      const incomplete = (pipeline.steps || []).find(
        (step) => step.status !== "done",
      );
      if (incomplete) {
        throw new Error(
          `CI Repair pipeline ${pipelineRunId} left ${incomplete.id} as ${incomplete.status}`,
        );
      }
      const pr = positiveInteger(pipeline.facts?.pr);
      if (!pr) throw new Error(`CI Repair pipeline ${pipelineRunId} returned no PR`);
      const pull = await requestJson(
        dependencies.fetch,
        `${githubBase}/pulls/${pr}`,
        { headers: githubHeaders },
      );
      if (pull.merged !== true || !stringValue(pull.head?.ref)) {
        throw new Error(`CI Repair PR #${pr} was not merged`);
      }
      const branch = await requestJson(
        dependencies.fetch,
        `${githubBase}/branches/main`,
        { headers: githubHeaders },
      );
      const repairedSha = stringValue(branch.commit?.sha);
      if (!repairedSha || repairedSha === brokenSha) {
        throw new Error(`CI Repair cycle ${index + 1} did not replace the broken main commit`);
      }
      const successfulRun = await waitForWorkflowRun({
        dependencies,
        url: `${githubBase}/actions/workflows/${encodeURIComponent(config.workflowFile)}/runs?branch=main&event=push&per_page=20`,
        headers: githubHeaders,
        headSha: repairedSha,
        conclusion: "success",
        timeoutMs: config.timeoutMs,
        pollMs: config.pollMs,
      });
      cycles.push({
        cycle: index + 1,
        pipelineRunId,
        failedRunId: failedRun.id,
        brokenSha,
        pr,
        repairBranch: pull.head.ref,
        repairedSha,
        successfulRunId: successfulRun.id,
      });
    }
    if (new Set(cycles.map((cycle) => cycle.repairBranch)).size !== cycles.length) {
      throw new Error("CI Repair reused a repair branch across independent cycles");
    }
    return { owner: config.owner, repo: config.repo, cycles };
  } catch (error) {
    await restoreFixture({
      dependencies,
      githubBase,
      sourcePath: config.sourcePath,
      headers: githubHeaders,
      originalContent: original.content,
    });
    throw error;
  }
}

async function waitForWorkflowRun(input) {
  return pollUntil(input, async () => {
    const payload = await requestJson(input.dependencies.fetch, input.url, {
      headers: input.headers,
    });
    const run = (payload.workflow_runs || []).find(
      (candidate) => candidate.head_sha === input.headSha,
    );
    if (!run || run.status !== "completed") return null;
    if (run.conclusion !== input.conclusion) {
      throw new Error(
        `CI run ${run.id} for ${input.headSha} ended as ${run.conclusion || "unknown"}; expected ${input.conclusion}`,
      );
    }
    return run;
  });
}

async function waitForPipeline(input) {
  return pollUntil(input, async () => {
    const payload = await requestJson(input.dependencies.fetch, input.url, {
      headers: input.headers,
    });
    const run = (payload.runs || []).find(
      (candidate) => candidate.runId === input.runId,
    );
    return run && run.status !== "running" ? run : null;
  });
}

async function pollUntil(input, read) {
  const deadline = Date.now() + input.timeoutMs;
  while (Date.now() < deadline) {
    const result = await read();
    if (result) return result;
    await input.dependencies.sleep(input.pollMs);
  }
  throw new Error(`Timed out waiting for ${input.runId || input.headSha}`);
}

async function readSource(fetch, githubBase, sourcePath, headers) {
  const payload = await requestJson(
    fetch,
    `${githubBase}/contents/${sourcePath}?ref=main`,
    { headers },
  );
  const sha = stringValue(payload.sha);
  const encoded = stringValue(payload.content).replace(/\s/g, "");
  if (!sha || !encoded) throw new Error(`Could not read tester fixture ${sourcePath}`);
  return { sha, content: Buffer.from(encoded, "base64").toString("utf8") };
}

async function writeSource(
  fetch,
  githubBase,
  sourcePath,
  headers,
  sha,
  content,
  message,
) {
  const payload = await requestJson(fetch, `${githubBase}/contents/${sourcePath}`, {
    method: "PUT",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      branch: "main",
      message,
      sha,
      content: Buffer.from(content).toString("base64"),
    }),
  });
  const commitSha = stringValue(payload.commit?.sha);
  if (!commitSha) throw new Error(`GitHub did not return a commit for ${sourcePath}`);
  return commitSha;
}

async function restoreFixture(input) {
  try {
    const current = await readSource(
      input.dependencies.fetch,
      input.githubBase,
      input.sourcePath,
      input.headers,
    );
    if (current.content === input.originalContent) return;
    await writeSource(
      input.dependencies.fetch,
      input.githubBase,
      input.sourcePath,
      input.headers,
      current.sha,
      input.originalContent,
      "test(ci-repair): restore tester fixture after gate failure",
    );
  } catch (restoreError) {
    process.stderr.write(
      `[ci-repair-live-gate] automatic restore failed: ${message(restoreError)}\n`,
    );
  }
}

function breakFixture(content) {
  if (!content.includes(".toUpperCase()")) {
    throw new Error("Tester fixture is not healthy; expected .toUpperCase()");
  }
  return content.replace(".toUpperCase()", ".toLowerCase()");
}

async function requestJson(fetch, url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(
      `${init?.method || "GET"} ${url} failed with HTTP ${response.status}: ${text.slice(0, 500)}`,
    );
  }
  return payload;
}

function validateConfig(config) {
  if (!/^https:\/\//.test(config.dashboardUrl || "")) {
    throw new Error("dashboardUrl must be HTTPS");
  }
  if (!stringValue(config.githubToken)) throw new Error("githubToken is required");
  if (
    config.owner !== "aharonyaircohen" ||
    config.repo !== "Kody-Engine-Tester"
  ) {
    throw new Error(
      "The mutating CI Repair gate may run only against aharonyaircohen/Kody-Engine-Tester",
    );
  }
  if (!Number.isInteger(config.cycles) || config.cycles < 2) {
    throw new Error("The CI Repair gate requires at least two cycles");
  }
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

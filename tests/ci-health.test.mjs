import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { waitForCiCompletion } from "../catalog/capabilities/ci-health-check/tools/scripts/ci-health-wait.mjs";
import { pullRequestCiResult } from "../catalog/capabilities/ci-health-check/tools/scripts/ci-health-model.mjs";

const runner = resolve(
  new URL(
    "../catalog/capabilities/ci-health-check/tools/run.sh",
    import.meta.url,
  ).pathname,
);
const prepareRunner = resolve(
  new URL(
    "../catalog/capabilities/prepare-ci-repair/tools/run.sh",
    import.meta.url,
  ).pathname,
);

async function fixture(state) {
  const cwd = await mkdtemp(join(tmpdir(), "kody-ci-health-"));
  await writeFile(
    join(cwd, "kody.config.json"),
    `${JSON.stringify({
      github: { owner: "acme", repo: "widget" },
      git: { defaultBranch: "main" },
    })}\n`,
  );
  const bin = join(cwd, "bin");
  await mkdir(bin);
  const gh = join(bin, "gh");
  await writeFile(
    gh,
    `#!/usr/bin/env node
const state = JSON.parse(process.env.CI_HEALTH_FIXTURE);
const args = process.argv.slice(2);
const command = args.join(" ");
if (state.githubError) {
  process.stderr.write("GitHub is unavailable\\n");
  process.exit(1);
}
if (command.startsWith("api repos/acme/widget/actions/runs")) {
  process.stdout.write(JSON.stringify({ workflow_runs: state.runs || [] }));
} else if (command.startsWith("api search/issues")) {
  const decoded = decodeURIComponent(command);
  const items = decoded.includes(" is:issue ")
    ? state.issues || []
    : state.pulls || [];
  process.stdout.write(JSON.stringify({ items }));
} else if (command === "issue create --repo acme/widget --title CI is red on main --body-file -") {
  process.stdout.write("https://github.com/acme/widget/issues/42\\n");
} else if (command === "api repos/acme/widget/pulls/7") {
  process.stdout.write(JSON.stringify(state.pull || {}));
} else if (command === "run view 77 --repo acme/widget --log-failed") {
  process.stdout.write(state.failureLog || "");
} else {
  process.stderr.write("unexpected gh command: " + command + "\\n");
  process.exit(2);
}
`,
  );
  await chmod(gh, 0o755);
  return { cwd, bin, state };
}

function run({ cwd, bin, state }, extraEnv = {}, script = runner) {
  const result = spawnSync("bash", [script], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      CI_HEALTH_FIXTURE: JSON.stringify(state),
      GITHUB_REPOSITORY: "acme/widget",
      GITHUB_RUN_ID: "900",
      ...extraEnv,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return { output: JSON.parse(result.stdout.trim()), stderr: result.stderr };
}

function workflowRun(overrides = {}) {
  return {
    id: 101,
    name: "CI",
    path: ".github/workflows/ci.yml",
    event: "push",
    status: "completed",
    conclusion: "success",
    head_branch: "main",
    head_sha: "sha-new",
    html_url: "https://github.com/acme/widget/actions/runs/101",
    created_at: "2026-08-07T10:00:00Z",
    ...overrides,
  };
}

describe("ci-health-check", () => {
  it("treats a new PR head with no checks yet as pending", () => {
    const output = pullRequestCiResult(
      [],
      {
        number: 7,
        html_url: "https://github.com/acme/widget/pull/7",
      },
      { currentRunId: "900" },
    );

    assert.equal(output.status, "pending");
    assert.equal(output.needsRepair, false);
  });

  it("waits for a pending CI run to reach a repairable result", async () => {
    const results = [
      { status: "pending", needsRepair: false, pr: 7, summary: "CI is starting." },
      { status: "pending", needsRepair: false, pr: 7, summary: "CI is running." },
      { status: "red", needsRepair: true, pr: 7, runId: 77, summary: "CI is red." },
    ];
    let reads = 0;
    let now = 0;

    const output = await waitForCiCompletion(
      async () => results[Math.min(reads++, results.length - 1)],
      {
        waitForCompletion: true,
        timeoutMs: 100,
        pollIntervalMs: 10,
        now: () => now,
        sleep: async (milliseconds) => {
          now += milliseconds;
        },
      },
    );

    assert.equal(output.status, "red");
    assert.equal(output.runId, 77);
    assert.equal(reads, 3);
  });

  it("blocks clearly when CI stays pending past the wait limit", async () => {
    let now = 0;
    const output = await waitForCiCompletion(
      async () => ({
        status: "pending",
        needsRepair: false,
        pr: 7,
        prUrl: "https://github.com/acme/widget/pull/7",
        headSha: "abc1234",
        failedChecks: [],
        summary: "CI is still running.",
      }),
      {
        waitForCompletion: true,
        timeoutMs: 20,
        pollIntervalMs: 10,
        now: () => now,
        sleep: async (milliseconds) => {
          now += milliseconds;
        },
      },
    );

    assert.equal(output.status, "blocked");
    assert.equal(output.needsRepair, false);
    assert.equal(output.pr, 7);
    assert.match(output.summary, /did not finish/i);
  });

  it("reports the latest default-branch CI commit as healthy", async () => {
    const setup = await fixture({ runs: [workflowRun()] });

    const { output } = run(setup);

    assert.deepEqual(output, {
      status: "healthy",
      needsRepair: false,
      failedChecks: [],
      runUrl: "https://github.com/acme/widget/actions/runs/101",
      summary: "CI is healthy on main.",
    });
  });

  it("ignores Kody orchestration and evaluates the repository CI run", async () => {
    const setup = await fixture({
      runs: [
        workflowRun({
          id: 900,
          name: "kody",
          path: ".github/workflows/kody.yml",
          conclusion: "failure",
          created_at: "2026-08-07T10:05:00Z",
        }),
        workflowRun(),
      ],
    });

    const { output } = run(setup);

    assert.equal(output.status, "healthy");
    assert.equal(output.runUrl, "https://github.com/acme/widget/actions/runs/101");
  });

  it("ignores unrelated scheduled workflows on the default branch", async () => {
    const setup = await fixture({
      runs: [
        workflowRun({
          id: 202,
          name: "Nightly observer",
          event: "schedule",
          conclusion: "failure",
          created_at: "2026-08-07T10:05:00Z",
        }),
        workflowRun(),
      ],
    });

    const { output } = run(setup);

    assert.equal(output.status, "healthy");
    assert.equal(output.runUrl, "https://github.com/acme/widget/actions/runs/101");
  });

  it("returns pending when a check for the latest commit is still running", async () => {
    const setup = await fixture({
      runs: [workflowRun({ status: "in_progress", conclusion: null })],
    });

    const { output } = run(setup);

    assert.equal(output.status, "pending");
    assert.equal(output.needsRepair, false);
  });

  it("reports failed default-branch CI without creating repair state", async () => {
    const setup = await fixture({
      runs: [workflowRun({ conclusion: "failure" })],
      issues: [],
    });

    const { output } = run(setup);

    assert.equal(output.status, "red", JSON.stringify(output));
    assert.equal(output.needsRepair, true);
    assert.equal("issue" in output, false);
    assert.deepEqual(output.failedChecks, ["CI"]);
  });

  it("reads pull-request checks without creating a repository issue", async () => {
    const setup = await fixture({
      pull: {
        number: 7,
        html_url: "https://github.com/acme/widget/pull/7",
        head: { sha: "pr-sha-123" },
      },
      runs: [
        workflowRun({
          id: 77,
          name: "test",
          path: ".github/workflows/ci.yml",
          event: "pull_request",
          head_branch: "feature",
          head_sha: "pr-sha-123",
          status: "completed",
          conclusion: "failure",
          html_url: "https://github.com/acme/widget/actions/runs/77",
        }),
        workflowRun({
          id: 900,
          name: "kody",
          path: ".github/workflows/kody.yml",
          event: "pull_request",
          head_branch: "feature",
          head_sha: "pr-sha-123",
          conclusion: "failure",
        }),
      ],
      failureLog: [
        "test  FAIL tests/action.spec.ts > describeAction",
        "test  AssertionError: expected 'Approved' to be 'Approve'",
        "test  Expected: \"Approve\"",
        "test  Received: \"Approved\"",
      ].join("\n"),
    });

    const { output } = run(setup, { KODY_ARG_PR: "7" });

    assert.equal(output.status, "red", JSON.stringify(output));
    assert.equal(output.needsRepair, true);
    assert.equal(output.pr, 7);
    assert.equal(output.prUrl, "https://github.com/acme/widget/pull/7");
    assert.equal(output.headSha, "pr-sha-123");
    assert.equal("issue" in output, false);
    assert.deepEqual(output.failedChecks, ["test"]);
    assert.equal(output.runId, 77);
    assert.match(output.failureLog, /expected 'Approved' to be 'Approve'/);
  });

  it("reads workflow input from the generic capability contract", async () => {
    const setup = await fixture({
      pull: {
        number: 7,
        html_url: "https://github.com/acme/widget/pull/7",
        head: { sha: "pr-sha-123" },
      },
      runs: [],
    });

    const { output } = run(setup, {
      KODY_CAPABILITY_INPUT: JSON.stringify({
        pr: 7,
        waitForCompletion: false,
        timeoutSeconds: 60,
      }),
    });

    assert.equal(output.status, "pending");
    assert.equal(output.pr, 7);
    assert.equal(output.headSha, "pr-sha-123");
  });

  it("keeps failure evidence from each failed job within the shared size limit", async () => {
    const setup = await fixture({
      pull: {
        number: 7,
        html_url: "https://github.com/acme/widget/pull/7",
        head: { sha: "pr-sha-123" },
      },
      runs: [
        workflowRun({
          id: 77,
          name: "CI",
          event: "pull_request",
          head_branch: "feature",
          head_sha: "pr-sha-123",
          conclusion: "failure",
          html_url: "https://github.com/acme/widget/actions/runs/77",
        }),
      ],
      failureLog: [
        "test\tTests\tFAIL tests/action.spec.ts > describeAction",
        "test\tTests\tAssertionError: expected 'Approved' to be 'Approve'",
        "test\tTests\tExpected: \"Approve\"",
        "test\tTests\tReceived: \"Approved\"",
        ...Array.from(
          { length: 600 },
          (_, index) => `e2e\tE2E\tERR_AUTH noisy browser failure ${index} ${"x".repeat(40)}`,
        ),
      ].join("\n"),
    });

    const { output } = run(setup, { KODY_ARG_PR: "7" });

    assert.match(output.failureLog, /expected 'Approved' to be 'Approve'/);
    assert.match(output.failureLog, /noisy browser failure/);
    assert.ok(output.failureLog.length <= 8000);
  });

  it("keeps an early root error when a later browser assertion is also present", async () => {
    const setup = await fixture({
      pull: {
        number: 7,
        html_url: "https://github.com/acme/widget/pull/7",
        head: { sha: "pr-sha-123" },
      },
      runs: [
        workflowRun({
          id: 77,
          name: "CI",
          event: "pull_request",
          head_branch: "feature",
          head_sha: "pr-sha-123",
          conclusion: "failure",
          html_url: "https://github.com/acme/widget/actions/runs/77",
        }),
      ],
      failureLog: [
        "e2e\tE2E\tModule not found: Can't resolve 'crypto'",
        ...Array.from(
          { length: 10 },
          (_, index) => `e2e\tE2E\tcompiler output ${index}`,
        ),
        "e2e\tE2E\tError: CONVEX_URL not configured",
        "e2e\tE2E\tError: Bad credentials",
        ...Array.from(
          { length: 150 },
          (_, index) => `e2e\tE2E\tbrowser server output ${index}`,
        ),
        "e2e\tE2E\tAssertionError: expected heading to be visible",
        "e2e\tE2E\tProcess completed with exit code 1",
      ].join("\n"),
    });

    const { output } = run(setup, { KODY_ARG_PR: "7" });

    assert.match(output.failureLog, /Module not found: Can't resolve 'crypto'/);
    assert.match(output.failureLog, /CONVEX_URL not configured/);
    assert.match(output.failureLog, /Bad credentials/);
    assert.match(output.failureLog, /expected heading to be visible/);
    assert.ok(output.failureLog.length <= 8000);
  });

  it("blocks cleanly when no repository CI run exists", async () => {
    const setup = await fixture({ runs: [] });

    const { output } = run(setup);

    assert.deepEqual(output, {
      status: "blocked",
      needsRepair: false,
      failedChecks: [],
      summary: "No CI run was found for main.",
    });
  });

  it("contains GitHub failures at the adapter boundary", async () => {
    const setup = await fixture({ githubError: true });

    const { output, stderr } = run(setup);

    assert.equal(output.status, "blocked");
    assert.equal(output.needsRepair, false);
    assert.match(output.summary, /GitHub is unavailable/i);
    assert.match(stderr, /GitHub is unavailable/i);
  });
});

describe("prepare-ci-repair", () => {
  const repairInput = {
    status: "red",
    needsRepair: true,
    failedChecks: ["CI"],
    runUrl: "https://github.com/acme/widget/actions/runs/101",
    summary: "CI is red on main.",
  };

  it("creates the stable repair issue as a separate action", async () => {
    const setup = await fixture({ issues: [], pulls: [] });

    const { output } = run(
      setup,
      { KODY_CAPABILITY_INPUT: JSON.stringify(repairInput) },
      prepareRunner,
    );

    assert.deepEqual(output, {
      status: "ready",
      hasOpenPr: false,
      issue: 42,
      summary: "CI repair task #42 is ready.",
    });
  });

  it("reuses the stable issue and linked open repair PR", async () => {
    const setup = await fixture({
      issues: [
        { number: 35, body: "<!-- kody-track:default-branch-ci-red -->" },
      ],
      pulls: [
        {
          number: 36,
          html_url: "https://github.com/acme/widget/pull/36",
          body: "Fixes #35",
          title: "Fix CI on main",
        },
      ],
    });

    const { output } = run(
      setup,
      { KODY_CAPABILITY_INPUT: JSON.stringify(repairInput) },
      prepareRunner,
    );

    assert.equal(output.status, "ready");
    assert.equal(output.issue, 35);
    assert.equal(output.hasOpenPr, true);
    assert.equal(output.pr, 36);
    assert.equal(output.prUrl, "https://github.com/acme/widget/pull/36");
  });
});

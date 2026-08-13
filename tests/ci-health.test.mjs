import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { waitForCiCompletion } from "../catalog/capabilities/ci-health-check/tools/scripts/ci-health-wait.mjs";
import {
  exactRunCiResult,
  pullRequestCiResult,
} from "../catalog/capabilities/ci-health-check/tools/scripts/ci-health-model.mjs";

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
  const attemptFile = join(cwd, "github-attempts");
  const issueEditFile = join(cwd, "issue-edit-body");
  const issueCloseFile = join(cwd, "issue-close");
  await writeFile(
    gh,
    `#!/usr/bin/env node
const fs = require("node:fs");
const state = JSON.parse(process.env.CI_HEALTH_FIXTURE);
const args = process.argv.slice(2);
const command = args.join(" ");
if (state.githubError) {
  process.stderr.write("GitHub is unavailable\\n");
  process.exit(1);
}
if (state.transientGithubFailures) {
  let attempts = 0;
  try { attempts = Number(fs.readFileSync(process.env.CI_HEALTH_ATTEMPT_FILE, "utf8")) || 0; } catch {}
  attempts += 1;
  fs.writeFileSync(process.env.CI_HEALTH_ATTEMPT_FILE, String(attempts));
  if (attempts <= state.transientGithubFailures) {
    process.stderr.write("tls: failed to verify certificate: x509 certificate error\\n");
    process.exit(1);
  }
}
if (command === "api repos/acme/widget/actions/runs/77") {
  process.stdout.write(JSON.stringify(state.exactRun || {}));
} else if (command.startsWith("api repos/acme/widget/actions/runs")) {
  process.stdout.write(JSON.stringify({ workflow_runs: state.runs || [] }));
} else if (command.startsWith("api search/issues")) {
  const decoded = decodeURIComponent(command);
  const items = decoded.includes(" is:issue ")
    ? state.issues || []
    : decoded.includes(" is:closed ")
      ? state.closedPulls || []
      : state.pulls || [];
  process.stdout.write(JSON.stringify({ items }));
} else if (command === "issue create --repo acme/widget --title CI is red on main --body-file -") {
  process.stdout.write("https://github.com/acme/widget/issues/42\\n");
} else if (command === "issue edit 35 --repo acme/widget --body-file -") {
  fs.writeFileSync(process.env.CI_REPAIR_ISSUE_EDIT_FILE, fs.readFileSync(0, "utf8"));
} else if (command === "issue close 35 --repo acme/widget") {
  fs.writeFileSync(process.env.CI_REPAIR_ISSUE_CLOSE_FILE, "35");
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
  return { cwd, bin, state, attemptFile, issueEditFile, issueCloseFile };
}

function run({ cwd, bin, state }, extraEnv = {}, script = runner) {
  const result = spawnSync("bash", [script], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      CI_HEALTH_FIXTURE: JSON.stringify(state),
      CI_HEALTH_ATTEMPT_FILE: join(cwd, "github-attempts"),
      CI_REPAIR_ISSUE_EDIT_FILE: join(cwd, "issue-edit-body"),
      CI_REPAIR_ISSUE_CLOSE_FILE: join(cwd, "issue-close"),
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
  it("allows the script to outlive the longest supported CI wait", async () => {
    const contract = JSON.parse(
      await readFile(
        new URL(
          "../catalog/capabilities/ci-health-check/contract.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const longestWaitMs =
      contract.input.properties.timeoutSeconds.maximum * 1000;

    assert.ok(contract.timeoutMs > longestWaitMs);
    assert.deepEqual(contract.output.properties.pr.type, ["integer", "null"]);
    assert.equal(contract.output.properties.branch.type, "string");
    assert.equal(contract.output.properties.headSha.type, "string");
  });

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

  it("derives an existing PR from an exact workflow run", () => {
    const output = exactRunCiResult(
      workflowRun({
        id: 77,
        conclusion: "failure",
        head_sha: "abc1234",
        pull_requests: [{ number: 7 }],
      }),
      { runId: 77, branch: "main", headSha: "abc1234" },
    );

    assert.equal(output.pr, 7);
    assert.equal(output.needsRepair, true);
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

  it("recovers from a transient GitHub read failure without restarting the workflow", async () => {
    const setup = await fixture({
      transientGithubFailures: 2,
      runs: [workflowRun()],
    });

    const { output, stderr } = run(setup, {
      KODY_GITHUB_RETRY_DELAY_MS: "1",
    });

    assert.equal(output.status, "healthy");
    assert.match(stderr, /retrying \(1\/3\)/);
    assert.match(stderr, /retrying \(2\/3\)/);
    assert.equal(await readFile(setup.attemptFile, "utf8"), "3");
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

  it("reads the exact failed run when no pull request exists", async () => {
    const exactRun = workflowRun({
      id: 77,
      name: "test",
      head_branch: "main",
      head_sha: "main-sha-123",
      conclusion: "failure",
      html_url: "https://github.com/acme/widget/actions/runs/77",
    });
    const setup = await fixture({
      exactRun,
      failureLog: "test  AssertionError: expected true to be false",
    });

    const { output } = run(setup, {
      KODY_CAPABILITY_INPUT: JSON.stringify({
        branch: "main",
        runId: 77,
        headSha: "main-sha-123",
      }),
    });

    assert.equal(output.status, "red", JSON.stringify(output));
    assert.equal(output.needsRepair, true);
    assert.equal(output.pr, null);
    assert.equal(output.branch, "main");
    assert.equal(output.runId, 77);
    assert.equal(output.headSha, "main-sha-123");
    assert.deepEqual(output.failedChecks, ["test"]);
    assert.match(output.failureLog, /expected true to be false/);
  });

  it("blocks when the supplied branch and SHA do not match the exact run", async () => {
    const setup = await fixture({
      exactRun: workflowRun({
        id: 77,
        head_branch: "feature",
        head_sha: "feature-sha-123",
        conclusion: "failure",
      }),
    });

    const { output } = run(setup, {
      KODY_CAPABILITY_INPUT: JSON.stringify({
        branch: "main",
        runId: 77,
        headSha: "main-sha-123",
      }),
    });

    assert.equal(output.status, "blocked");
    assert.equal(output.needsRepair, false);
    assert.match(output.summary, /does not match main/i);
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

  it("selects one actionable failure instead of mixing unrelated jobs", async () => {
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
    assert.doesNotMatch(output.failureLog, /noisy browser failure/);
    assert.equal(output.failure.check, "test");
    assert.equal(output.failure.log, output.failureLog);
    assert.match(output.failure.fingerprint, /^[a-f0-9]{64}$/);
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
    assert.doesNotMatch(output.failureLog, /CONVEX_URL not configured/);
    assert.doesNotMatch(output.failureLog, /Bad credentials/);
    assert.doesNotMatch(output.failureLog, /expected heading to be visible/);
    assert.ok(output.failureLog.length <= 8000);
  });

  it("marks an unchanged failure so the workflow can stop looping", async () => {
    const state = {
      pull: { number: 7, html_url: "https://github.com/acme/widget/pull/7", head: { sha: "pr-sha-123" } },
      runs: [workflowRun({ id: 77, event: "pull_request", head_sha: "pr-sha-123", conclusion: "failure", html_url: "https://github.com/acme/widget/actions/runs/77" })],
      failureLog: "test\tTests\tAssertionError: expected true to be false",
    };
    const first = run(await fixture(state), { KODY_CAPABILITY_INPUT: JSON.stringify({ pr: 7 }) }).output;
    const second = run(await fixture(state), {
      KODY_CAPABILITY_INPUT: JSON.stringify({ pr: 7, previousFailureFingerprint: first.failure.fingerprint }),
    }).output;
    assert.equal(second.repeatedFailure, true);
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

  it("passes through an existing pull request without creating a repair issue", async () => {
    const setup = await fixture({});

    const { output } = run(
      setup,
      {
        KODY_CAPABILITY_INPUT: JSON.stringify({
          ...repairInput,
          pr: 7,
          branch: "feature",
          headSha: "feature-sha-123",
          runId: 77,
        }),
      },
      prepareRunner,
    );

    assert.deepEqual(output, {
      status: "ready",
      hasOpenPr: true,
      pr: 7,
      summary: "CI repair PR #7 is ready.",
    });
  });

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
    const refreshedBody = await readFile(setup.issueEditFile, "utf8");
    assert.match(refreshedBody, /Run: https:\/\/github\.com\/acme\/widget\/actions\/runs\/101/);
    assert.match(refreshedBody, /Failed checks: CI/);
  });

  it("retires a completed repair issue before starting a new incident", async () => {
    const setup = await fixture({
      issues: [
        {
          number: 35,
          body: "<!-- kody:ci-health:v1 -->\nBranch: `main`",
        },
      ],
      pulls: [],
      closedPulls: [
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

    assert.equal(await readFile(setup.issueCloseFile, "utf8"), "35");
    assert.deepEqual(output, {
      status: "ready",
      hasOpenPr: false,
      issue: 42,
      summary: "CI repair task #42 is ready.",
    });
  });
});

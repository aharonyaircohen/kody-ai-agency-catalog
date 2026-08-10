const FAILED_CONCLUSIONS = new Set([
  "action_required",
  "cancelled",
  "failure",
  "stale",
  "startup_failure",
  "timed_out",
]);

export function repositoryCiResult(runs, input) {
  const candidates = runs
    .filter((run) => isRepositoryCiRun(run, input))
    .sort((left, right) => timestamp(right.created_at) - timestamp(left.created_at));
  const latest = candidates[0];
  if (!latest) {
    return blocked(`No CI run was found for ${input.defaultBranch}.`);
  }

  const commitRuns = candidates.filter((run) => run.head_sha === latest.head_sha);
  const runUrl = preferredRun(commitRuns)?.html_url;
  if (commitRuns.some((run) => run.status !== "completed")) {
    return {
      status: "pending",
      needsRepair: false,
      failedChecks: [],
      ...(runUrl ? { runUrl } : {}),
      summary: `CI is still running on ${input.defaultBranch}.`,
    };
  }

  const failedChecks = uniqueNames(
    commitRuns.filter((run) => FAILED_CONCLUSIONS.has(run.conclusion)),
  );
  if (failedChecks.length > 0) {
    return {
      status: "red",
      needsRepair: true,
      failedChecks,
      ...(runUrl ? { runUrl } : {}),
      summary: `CI is red on ${input.defaultBranch}: ${failedChecks.join(", ")}.`,
    };
  }

  return {
    status: "healthy",
    needsRepair: false,
    failedChecks: [],
    ...(runUrl ? { runUrl } : {}),
    summary: `CI is healthy on ${input.defaultBranch}.`,
  };
}

export function pullRequestCiResult(runs, pullRequest, input) {
  const pr = pullRequest.number;
  const prUrl = pullRequest.html_url;
  if (!Number.isInteger(pr) || pr < 1 || typeof prUrl !== "string") {
    return blocked("The pull request could not be read.");
  }
  const candidates = runs.filter((run) => isObservedRun(run, input));
  if (candidates.length === 0) {
    return {
      status: "pending",
      needsRepair: false,
      pr,
      prUrl,
      failedChecks: [],
      summary: `CI has not started on PR #${pr} yet.`,
    };
  }
  const runUrl = preferredRun(candidates)?.html_url;
  if (candidates.some((run) => run.status !== "completed")) {
    return {
      status: "pending",
      needsRepair: false,
      pr,
      prUrl,
      failedChecks: [],
      ...(runUrl ? { runUrl } : {}),
      summary: `CI is still running on PR #${pr}.`,
    };
  }
  const failedChecks = uniqueNames(
    candidates.filter((run) => FAILED_CONCLUSIONS.has(run.conclusion)),
  );
  return failedChecks.length > 0
    ? {
        status: "red",
        needsRepair: true,
        pr,
        prUrl,
        failedChecks,
        ...(runUrl ? { runUrl } : {}),
        summary: `CI is red on PR #${pr}: ${failedChecks.join(", ")}.`,
      }
    : {
        status: "healthy",
        needsRepair: false,
        pr,
        prUrl,
        failedChecks: [],
        ...(runUrl ? { runUrl } : {}),
        summary: `CI is healthy on PR #${pr}.`,
      };
}

function isRepositoryCiRun(run, input) {
  if (!isObservedRun(run, input)) return false;
  if (run.head_branch !== input.defaultBranch) return false;
  return run.event === "push";
}

function isObservedRun(run, input) {
  if (!run || typeof run !== "object") return false;
  if (String(run.id) === input.currentRunId) return false;
  if (run.path === ".github/workflows/kody.yml") return false;
  return String(run.name || "").toLowerCase() !== "kody";
}

function preferredRun(runs) {
  return (
    runs.find((run) => FAILED_CONCLUSIONS.has(run.conclusion)) ||
    runs.find((run) => run.status !== "completed") ||
    runs[0]
  );
}

function uniqueNames(runs) {
  return [
    ...new Set(
      runs
        .map((run) => run.name)
        .filter((name) => typeof name === "string" && name.trim())
        .map((name) => name.trim()),
    ),
  ];
}

function blocked(summary) {
  return {
    status: "blocked",
    needsRepair: false,
    failedChecks: [],
    summary,
  };
}

function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const ISSUE_MARKER = "<!-- kody:ci-health:v1 -->";

try {
  const config = readConfig();
  const repository = repositoryName(config);
  const defaultBranch = stringValue(config.git?.defaultBranch) || "main";
  const input = readInput();
  if (input.status !== "red" || !Array.isArray(input.failedChecks)) {
    throw new Error("CI repair preparation requires one red CI observation");
  }
  const issue = ensureRepairIssue(repository, defaultBranch, input);
  const linkedPr = findLinkedRepairPullRequest(repository, issue);
  emit({
    status: "ready",
    hasOpenPr: Boolean(linkedPr),
    issue,
    ...(linkedPr ? { pr: linkedPr.number, prUrl: linkedPr.html_url } : {}),
    summary: linkedPr
      ? `CI repair PR #${linkedPr.number} is ready.`
      : `CI repair task #${issue} is ready.`,
  });
} catch (error) {
  process.stderr.write(`prepare-ci-repair: ${message(error)}\n`);
  emit({
    status: "blocked",
    hasOpenPr: false,
    summary: `CI repair task could not be prepared: ${message(error)}`,
  });
}

function ensureRepairIssue(repository, defaultBranch, input) {
  const issues = searchIssues(
    repository,
    `is:issue is:open in:body "${ISSUE_MARKER}"`,
  );
  const existing = issues.find(
    (issue) =>
      Number.isInteger(issue.number) &&
      issue.number > 0 &&
      typeof issue.body === "string" &&
      issue.body.includes(ISSUE_MARKER),
  );
  if (existing) return existing.number;

  const body = [
    ISSUE_MARKER,
    "",
    `CI is failing on the default branch \`${defaultBranch}\`.`,
    "",
    `Failed checks: ${input.failedChecks.join(", ")}`,
    stringValue(input.runUrl) ? `Run: ${input.runUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const created = gh(
    [
      "issue",
      "create",
      "--repo",
      repository,
      "--title",
      `CI is red on ${defaultBranch}`,
      "--body-file",
      "-",
    ],
    body,
  );
  const match = created.match(/\/issues\/(\d+)/);
  const issue = match ? Number.parseInt(match[1], 10) : 0;
  if (!Number.isInteger(issue) || issue < 1) {
    throw new Error("GitHub did not return the created repair issue number");
  }
  return issue;
}

function findLinkedRepairPullRequest(repository, issue) {
  const pulls = searchIssues(
    repository,
    `is:pr is:open in:title,body ${issue}`,
  );
  const reference = new RegExp(`(?:#|issues/)${issue}(?:\\b|$)`);
  return pulls.find(
    (pull) =>
      Number.isInteger(pull.number) &&
      pull.number > 0 &&
      typeof pull.html_url === "string" &&
      reference.test(`${pull.title || ""}\n${pull.body || ""}`),
  );
}

function searchIssues(repository, qualifiers) {
  const query = encodeURIComponent(`repo:${repository} ${qualifiers}`);
  const response = ghJson([
    "api",
    `search/issues?q=${query}&per_page=100`,
  ]);
  return Array.isArray(response.items) ? response.items : [];
}

function ghJson(args) {
  const output = gh(args);
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`GitHub returned invalid JSON for: gh ${args.join(" ")}`);
  }
}

function gh(args, input) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    input,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const detail = stringValue(result.stderr).slice(-500);
    throw new Error(detail || `gh ${args[0]} failed with exit ${result.status}`);
  }
  return result.stdout.trim();
}

function readInput() {
  try {
    const parsed = JSON.parse(process.env.KODY_CAPABILITY_INPUT || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function repositoryName(config) {
  const configured =
    stringValue(config.github?.owner) && stringValue(config.github?.repo)
      ? `${stringValue(config.github.owner)}/${stringValue(config.github.repo)}`
      : "";
  const repository = configured || stringValue(process.env.GITHUB_REPOSITORY);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("Repository identity is missing or invalid");
  }
  return repository;
}

function readConfig() {
  try {
    return JSON.parse(readFileSync("kody.config.json", "utf8"));
  } catch {
    return {};
  }
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

function emit(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(0);
}

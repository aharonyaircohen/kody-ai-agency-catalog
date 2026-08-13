import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const MARKER = "<!-- kody:strategy-application:v1 -->";

try {
  const input = JSON.parse(process.env.KODY_CAPABILITY_INPUT || "{}");
  const repository = repositoryName();
  const requestId = required(input.requestId, "requestId");
  const marker = `${MARKER}\nRequest: \`${requestId}\``;
  const existing = search(repository, requestId).find(
    (issue) => issue.body?.includes(marker) && issue.state === "open",
  );
  const issue = existing?.number ?? create(repository, input, marker);
  emit({
    status: "ready",
    issue,
    summary: `Strategy application issue #${issue} is ready.`,
  });
} catch (error) {
  emit({
    status: "blocked",
    summary: error instanceof Error ? error.message : String(error),
  });
}

function repositoryName() {
  let config = {};
  try {
    config = JSON.parse(readFileSync("kody.config.json", "utf8"));
  } catch {}
  const configured = `${config.github?.owner || ""}/${config.github?.repo || ""}`;
  const value = configured !== "/" ? configured : process.env.GITHUB_REPOSITORY || "";
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error("Repository identity is missing or invalid");
  }
  return value;
}

function search(repository, requestId) {
  const query = encodeURIComponent(
    `repo:${repository} is:issue in:body \"${MARKER}\" \"${requestId}\"`,
  );
  const result = gh(["api", `search/issues?q=${query}&per_page=20`]);
  return Array.isArray(result.items) ? result.items : [];
}

function create(repository, input, marker) {
  const blueprintId = required(input.blueprintId, "blueprintId");
  const body = [
    marker,
    "",
    `Apply Strategy Blueprint \`${blueprintId}@${required(input.blueprintVersion, "blueprintVersion")}\`.`,
    "",
    required(input.outcome, "outcome"),
  ].join("\n");
  const result = run([
    "issue",
    "create",
    "--repo",
    repository,
    "--title",
    `Apply ${blueprintId} Strategy`,
    "--body-file",
    "-",
  ], body);
  const match = result.match(/\/issues\/(\d+)/);
  if (!match) throw new Error("GitHub did not return the Strategy issue number");
  return Number(match[1]);
}

function gh(args) {
  const output = run(args);
  try {
    return JSON.parse(output);
  } catch {
    throw new Error("GitHub returned invalid JSON");
  }
}

function run(args, input) {
  const result = spawnSync("gh", args, { encoding: "utf8", input });
  if (result.status !== 0) {
    throw new Error((result.stderr || `gh ${args[0]} failed`).trim().slice(-500));
  }
  return result.stdout.trim();
}

function required(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
  process.exit(0);
}

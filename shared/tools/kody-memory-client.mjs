const DEFAULT_KODY_API_URL = "https://kody-dashboard-khaki.vercel.app";
const OIDC_AUDIENCE = "kody-api";
const REQUEST_TIMEOUT_MS = 30_000;

function httpsUrl(value, label) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS`);
  return url;
}

function required(value, label) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

export async function engineIdentityToken(env, fetchImpl = fetch) {
  if (env.GITHUB_ACTIONS !== "true") {
    throw new Error("GitHub Actions identity is required");
  }
  const requestUrl = httpsUrl(
    required(
      env.ACTIONS_ID_TOKEN_REQUEST_URL,
      "GitHub Actions identity URL",
    ),
    "GitHub Actions identity URL",
  );
  requestUrl.searchParams.set("audience", OIDC_AUDIENCE);
  const requestToken = required(
    env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    "GitHub Actions identity request token",
  );
  const response = await fetchImpl(requestUrl, {
    headers: { Authorization: `Bearer ${requestToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`GitHub Actions identity request failed (${response.status})`);
  }
  const body = await response.json();
  return required(body?.value, "GitHub Actions identity token");
}

async function callEngineApi(
  path,
  command,
  { env = process.env, fetchImpl = fetch } = {},
) {
  if (!command || typeof command !== "object" || Array.isArray(command)) {
    throw new Error("Memory command must be one JSON object");
  }
  const apiUrl = httpsUrl(
    env.KODY_API_URL?.trim() || DEFAULT_KODY_API_URL,
    "Kody API URL",
  );
  const token = await engineIdentityToken(env, fetchImpl);
  const response = await fetchImpl(
    new URL(path, apiUrl),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      body && typeof body.error === "string"
        ? `: ${body.error}`
        : "";
    throw new Error(`Kody memory request failed (${response.status})${code}`);
  }
  return body;
}

export async function callMemoryApi(command, options) {
  return callEngineApi("/api/kody/engine/memory", command, options);
}

export async function callMemoryLearningApi(command, options) {
  return callEngineApi("/api/kody/engine/memory-learning", command, options);
}

export async function callMemoryTool(command, options) {
  if (!command || typeof command !== "object" || Array.isArray(command)) {
    throw new Error("Memory command must be one JSON object");
  }
  const { resource = "memory", ...request } = command;
  if (resource === "memory") return callMemoryApi(request, options);
  if (resource === "learning") return callMemoryLearningApi(request, options);
  throw new Error('Memory resource must be "memory" or "learning"');
}

export async function runMemoryTool(argv = process.argv.slice(2)) {
  if (argv.length !== 1) {
    throw new Error("Pass exactly one JSON memory command");
  }
  let command;
  try {
    command = JSON.parse(argv[0]);
  } catch {
    throw new Error("Memory command must be valid JSON");
  }
  const result = await callMemoryTool(command);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

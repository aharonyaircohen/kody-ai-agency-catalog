export async function waitForCiCompletion(observe, options = {}) {
  const waitForCompletion = options.waitForCompletion === true;
  const timeoutMs = positiveNumber(options.timeoutMs, 30 * 60 * 1000);
  const pollIntervalMs = positiveNumber(options.pollIntervalMs, 10 * 1000);
  const now = typeof options.now === "function" ? options.now : Date.now;
  const sleep = typeof options.sleep === "function" ? options.sleep : defaultSleep;
  const deadline = now() + timeoutMs;

  let result = await observe();
  while (waitForCompletion && result.status === "pending") {
    const remaining = deadline - now();
    if (remaining <= 0) return timedOut(result);
    await sleep(Math.min(pollIntervalMs, remaining));
    result = await observe();
  }
  return result;
}

function timedOut(result) {
  return {
    status: "blocked",
    needsRepair: false,
    ...(result.pr ? { pr: result.pr } : {}),
    ...(result.prUrl ? { prUrl: result.prUrl } : {}),
    ...(result.headSha ? { headSha: result.headSha } : {}),
    failedChecks: result.failedChecks || [],
    ...(result.runUrl ? { runUrl: result.runUrl } : {}),
    summary: "CI did not finish before the wait limit.",
  };
}

function positiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function defaultSleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

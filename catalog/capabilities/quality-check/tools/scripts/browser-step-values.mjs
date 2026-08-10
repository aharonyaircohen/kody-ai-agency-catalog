export function resolveFillValue(step, environment = process.env) {
  if (typeof step?.value === "string") return step.value;
  if (step?.valueFrom !== "github-test-token") {
    throw new Error("Unsupported protected value.");
  }
  const token = clean(environment.E2E_GITHUB_TOKEN);
  if (!token) throw new Error("GitHub test token is not configured.");
  return token;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

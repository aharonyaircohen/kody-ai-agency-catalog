set -euo pipefail

failure_reported=0

emit_failure() {
  local summary="$1"
  [[ "$failure_reported" = "1" ]] && return 0
  failure_reported=1
  python3 - "$summary" <<'PY'
import json
import sys

summary = sys.argv[1]
print("KODY_CAPABILITY_RESULT=" + json.dumps({
    "version": 1,
    "status": "fail",
    "summary": summary,
    "facts": {},
    "artifacts": [],
    "missingEvidence": ["devDeployed"],
    "blockers": [summary],
}, separators=(",", ":")))
PY
}

fail() {
  echo "FAILED: $1"
  emit_failure "$1" || true
  exit 1
}

on_error() {
  local status="$1"
  emit_failure "Vercel dev deploy failed with exit ${status}" || true
}
trap 'on_error "$?"' ERR

for command in git node curl python3; do
  command -v "$command" >/dev/null 2>&1 || fail "Missing command: $command"
done

vercel_cmd=(vercel)
if ! command -v vercel >/dev/null 2>&1; then
  command -v npx >/dev/null 2>&1 || fail "Missing command: npx"
  vercel_cmd=(npx -y -p vercel@54.10.2 vercel)
fi

variable_value() {
  node -e '
    const fs = require("fs")
    const name = process.argv[1]
    try {
      const doc = JSON.parse(fs.readFileSync(".kody/variables.json", "utf8"))
      const value = doc.variables?.[name]?.value
      if (typeof value === "string") process.stdout.write(value)
    } catch {}
  ' "$1"
}

value_or_variable() {
  local env_value="$1"
  local variable_name="$2"
  local default_value="${3:-}"
  if [ -n "$env_value" ]; then
    printf '%s' "$env_value"
    return
  fi
  local variable
  variable="$(variable_value "$variable_name")"
  printf '%s' "${variable:-$default_value}"
}

capability_input_value() {
  node -e '
    try {
      const input = JSON.parse(process.env.KODY_CAPABILITY_INPUT || "{}")
      const value = input[process.argv[1]]
      if (typeof value === "string") process.stdout.write(value)
    } catch {}
  ' "$1"
}

DEPLOY_BRANCH="$(value_or_variable "${VERCEL_DEV_BRANCH:-}" "VERCEL_DEV_BRANCH" "${KODY_CFG_GIT_DEFAULTBRANCH:-dev}")"
TARGET="$(capability_input_value target)"
TARGET="${TARGET:-preview}"
INPUT_DEV_URL="$(capability_input_value devUrl)"
DEV_URL="$(value_or_variable "${INPUT_DEV_URL:-${DEV_URL:-}}" "DEV_URL" "${KODY_CFG_RELEASE_DEVURL:-${KODY_CFG_QA_FALLBACKURL:-}}")"
VERCEL_ORG_ID="$(value_or_variable "${VERCEL_ORG_ID:-}" "VERCEL_ORG_ID")"
VERCEL_PROJECT_ID="$(value_or_variable "${VERCEL_PROJECT_ID:-}" "VERCEL_PROJECT_ID")"
export VERCEL_ORG_ID VERCEL_PROJECT_ID

token="${VERCEL_ACCESS_TOKEN:-${VERCEL_TOKEN:-}}"
[ -n "$token" ] || fail "Kody secret VERCEL_ACCESS_TOKEN is required"
[ -n "$VERCEL_ORG_ID" ] || fail "Kody secret VERCEL_ORG_ID is required"
[ -n "$VERCEL_PROJECT_ID" ] || fail "Kody secret VERCEL_PROJECT_ID is required"

current_branch="$(git branch --show-current)"
[ "$current_branch" = "$DEPLOY_BRANCH" ] || fail "Expected branch '${DEPLOY_BRANCH}', got '${current_branch}'"
git diff --quiet && git diff --cached --quiet || fail "Working tree has tracked changes"

tmp_json="$(mktemp)"
trap 'rm -f "$tmp_json"' EXIT
vercel_args=(--token "$token")

echo "Deploying ${current_branch} to Vercel ${TARGET}..."
if ! "${vercel_cmd[@]}" deploy --target="$TARGET" --yes --format=json "${vercel_args[@]}" | tee "$tmp_json"; then
  fail "Vercel ${TARGET} deploy command failed"
fi

deployment_url="$(node -e '
  const fs = require("fs")
  const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
  const deployment = data.deployment && typeof data.deployment === "object" ? data.deployment : {}
  const url = data.url || deployment.url || data.inspectorUrl || deployment.inspectorUrl || ""
  if (!url) throw new Error("Vercel deploy output did not include a deployment URL")
  process.stdout.write(url.startsWith("http") ? url : `https://${url}`)
' "$tmp_json")"

if [ -n "$DEV_URL" ]; then
  dev_alias="${DEV_URL#https://}"
  dev_alias="${dev_alias%/}"
  "${vercel_cmd[@]}" alias set "$deployment_url" "$dev_alias" "${vercel_args[@]}" || fail "Failed to assign dev alias: ${dev_alias}"
fi

curl -fsSL --max-time 30 "$deployment_url" >/dev/null || fail "Dev deployment URL is not reachable: ${deployment_url}"
if [ -n "$DEV_URL" ]; then
  curl -fsSL --max-time 30 "$DEV_URL" >/dev/null || fail "Dev URL is not reachable: ${DEV_URL}"
fi

python3 - "$deployment_url" "$current_branch" "$DEV_URL" <<'PY'
import json
import sys

deployment_url, branch, dev_url = sys.argv[1:]
facts = {"devDeploymentUrl": deployment_url, "devBranch": branch}
if dev_url:
    facts["devUrl"] = dev_url
print("KODY_CAPABILITY_RESULT=" + json.dumps({
    "version": 1,
    "status": "pass",
    "summary": "Development preview deployed.",
    "evidence": {"devDeployed": True},
    "facts": facts,
    "artifacts": [{"label": "Vercel development deployment", "url": deployment_url}],
    "missingEvidence": [],
    "blockers": [],
}, separators=(",", ":")))
PY

echo "DONE"
echo "Dev deployment URL: ${deployment_url}"
[ -z "$DEV_URL" ] || echo "Stable dev URL: ${DEV_URL}"

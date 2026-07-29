set -euo pipefail

workflow="${KODY_CFG_RELEASE_DEPLOYMENT_WORKFLOW:-}"
input_prefix="KODY_CFG_RELEASE_DEPLOYMENT_INPUTS_"
default_branch="${KODY_CFG_GIT_DEFAULTBRANCH:-main}"
branch="${KODY_CFG_RELEASE_RELEASEBRANCH:-$default_branch}"
production_url="${KODY_CFG_RELEASE_PRODUCTIONURL:-}"
timeout_ms="${KODY_CFG_RELEASE_TIMEOUTMS:-1800000}"
poll_seconds=15

fail() {
  echo "KODY_REASON=$1"
  echo "KODY_SKIP_AGENT=true"
  exit "${2:-1}"
}

emit_result() {
  local run_id="$1"
  local run_url="$2"
  WORKFLOW="$workflow" BRANCH="$branch" HEAD_SHA="$head_sha" RUN_ID="$run_id" \
    RUN_URL="$run_url" PRODUCTION_URL="$production_url" python3 - <<'PY'
import json
import os

run_url = os.environ["RUN_URL"]
production_url = os.environ["PRODUCTION_URL"]
print("KODY_CAPABILITY_RESULT=" + json.dumps({
    "version": 1,
    "status": "pass",
    "summary": f"{os.environ['WORKFLOW']} deployed {os.environ['BRANCH']}",
    "evidence": {"productionDeployed": True},
    "facts": {
        "deploymentWorkflow": os.environ["WORKFLOW"],
        "deploymentBranch": os.environ["BRANCH"],
        "deploymentHeadSha": os.environ["HEAD_SHA"],
        "deploymentRun": int(os.environ["RUN_ID"]),
        "deploymentRunUrl": run_url,
        "deploymentConclusion": "success",
        "productionUrl": production_url,
    },
    "artifacts": [
        {"label": "Deployment workflow", "url": run_url},
        {"label": "Production", "url": production_url},
    ],
    "missingEvidence": [],
    "blockers": [],
}, separators=(",", ":")))
PY
}

[[ -n "$workflow" ]] ||
  fail "release-deploy: release.deployment.workflow is required" 99
[[ -n "$production_url" ]] ||
  fail "release-deploy: release.productionUrl is required" 99
[[ "$timeout_ms" =~ ^[0-9]+$ && "$timeout_ms" -gt 0 ]] ||
  fail "release-deploy: release.timeoutMs must be a positive integer" 99

git fetch origin "$branch" --quiet 2>/dev/null || true
head_sha="$(git rev-parse "origin/${branch}" 2>/dev/null)" ||
  fail "release-deploy: could not resolve origin/${branch}"

baseline_runs="$(gh run list --workflow "$workflow" --commit "$head_sha" \
  --event workflow_dispatch --limit 20 --json databaseId 2>/dev/null || printf '[]')"

dispatch_args=()
while IFS='=' read -r name value; do
  key="${name#"$input_prefix"}"
  key="$(printf '%s' "$key" | tr '[:upper:]' '[:lower:]')"
  dispatch_args+=("-f" "${key}=${value}")
done < <(env | grep "^${input_prefix}" | sort)

gh workflow run "$workflow" --ref "$branch" "${dispatch_args[@]}" ||
  fail "release-deploy: could not dispatch ${workflow} for ${branch}"

deadline=$(( $(date +%s) + (timeout_ms / 1000) ))
run_id=""
run_url=""
while [[ -z "$run_id" ]]; do
  runs="$(gh run list --workflow "$workflow" --commit "$head_sha" \
    --event workflow_dispatch --limit 20 --json databaseId,url 2>/dev/null || printf '[]')"
  read -r run_id run_url < <(
    BASELINE="$baseline_runs" RUNS="$runs" python3 - <<'PY'
import json
import os

baseline = {
    row.get("databaseId")
    for row in json.loads(os.environ["BASELINE"] or "[]")
    if isinstance(row, dict)
}
for row in json.loads(os.environ["RUNS"] or "[]"):
    if isinstance(row, dict) and row.get("databaseId") not in baseline:
        print(row.get("databaseId", ""), row.get("url", ""))
        break
PY
  ) || true
  [[ -n "$run_id" ]] && break
  (( $(date +%s) < deadline )) ||
    fail "release-deploy: dispatched ${workflow}, but its run was not observable"
  sleep 2
done

while true; do
  run_view="$(gh run view "$run_id" --json status,conclusion,url 2>/dev/null)" ||
    fail "release-deploy: deployment run ${run_id} could not be read"
  status="$(printf '%s' "$run_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",""))')"
  conclusion="$(printf '%s' "$run_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("conclusion",""))')"
  run_url="$(printf '%s' "$run_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("url",""))')"
  if [[ "$status" == "completed" ]]; then
    [[ "$conclusion" == "success" ]] ||
      fail "release-deploy: ${workflow} run ${run_id} completed with ${conclusion:-unknown}"
    break
  fi
  (( $(date +%s) < deadline )) ||
    fail "release-deploy: ${workflow} run ${run_id} exceeded ${timeout_ms}ms"
  echo "release-deploy: ${workflow} run ${run_id} is ${status:-pending}; sleeping ${poll_seconds}s"
  sleep "$poll_seconds"
done

curl -fsSL --max-time 30 "$production_url" >/dev/null ||
  fail "release-deploy: production URL is not reachable: ${production_url}"

emit_result "$run_id" "$run_url"
echo "KODY_SKIP_AGENT=true"

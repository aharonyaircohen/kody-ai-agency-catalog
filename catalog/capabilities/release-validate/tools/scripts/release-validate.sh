#!/usr/bin/env bash
set -euo pipefail

pr="${KODY_ARG_PR:-}"
workflow="${KODY_CFG_RELEASE_VALIDATION_WORKFLOW:-}"
input_prefix="KODY_CFG_RELEASE_VALIDATION_INPUTS_"
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
  PR="$pr" WORKFLOW="$workflow" HEAD_SHA="$head_sha" RUN_ID="$run_id" \
    RUN_URL="$run_url" python3 - <<'PY'
import json
import os

print("KODY_CAPABILITY_RESULT=" + json.dumps({
    "version": 1,
    "status": "pass",
    "summary": f"{os.environ['WORKFLOW']} passed for release PR #{os.environ['PR']}",
    "evidence": {"releaseValidated": True},
    "facts": {
        "validationPr": int(os.environ["PR"]),
        "validationWorkflow": os.environ["WORKFLOW"],
        "validationHeadSha": os.environ["HEAD_SHA"],
        "validationRun": int(os.environ["RUN_ID"]),
        "validationRunUrl": os.environ["RUN_URL"],
        "validationConclusion": "success",
    },
}, separators=(",", ":")))
PY
}

[[ "$pr" =~ ^[0-9]+$ ]] || fail "release-validate: --pr is required" 99
[[ -n "$workflow" ]] || fail "release-validate: release.validation.workflow is required" 99
[[ "$timeout_ms" =~ ^[0-9]+$ && "$timeout_ms" -gt 0 ]] ||
  fail "release-validate: release.timeoutMs must be a positive integer" 99

pr_view="$(gh pr view "$pr" --json state,headRefName,headRefOid 2>/dev/null)" ||
  fail "release-validate: PR #${pr} could not be read"
state="$(printf '%s' "$pr_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("state",""))')"
head_ref="$(printf '%s' "$pr_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("headRefName",""))')"
head_sha="$(printf '%s' "$pr_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("headRefOid",""))')"

[[ "$state" == "OPEN" ]] || fail "release-validate: PR #${pr} is not open (state: ${state:-unknown})"
[[ -n "$head_ref" && -n "$head_sha" ]] ||
  fail "release-validate: PR #${pr} has no resolvable head"

baseline_runs="$(gh run list --workflow "$workflow" --commit "$head_sha" \
  --event workflow_dispatch --limit 20 --json databaseId 2>/dev/null || printf '[]')"

dispatch_args=()
while IFS='=' read -r name value; do
  key="${name#"$input_prefix"}"
  key="$(printf '%s' "$key" | tr '[:upper:]' '[:lower:]')"
  dispatch_args+=("-f" "${key}=${value}")
done < <(env | grep "^${input_prefix}" | sort)

gh workflow run "$workflow" --ref "$head_ref" "${dispatch_args[@]}" ||
  fail "release-validate: could not dispatch ${workflow} for ${head_ref}"

deadline=$(( $(date +%s) + (timeout_ms / 1000) ))
run_id=""
run_url=""
while [[ -z "$run_id" ]]; do
  runs="$(gh run list --workflow "$workflow" --commit "$head_sha" \
    --event workflow_dispatch --limit 20 \
    --json databaseId,status,conclusion,url 2>/dev/null || printf '[]')"
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
    fail "release-validate: dispatched ${workflow}, but its run was not observable"
  sleep 2
done

while true; do
  run_view="$(gh run view "$run_id" --json status,conclusion,url 2>/dev/null)" ||
    fail "release-validate: validation run ${run_id} could not be read"
  status="$(printf '%s' "$run_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",""))')"
  conclusion="$(printf '%s' "$run_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("conclusion",""))')"
  run_url="$(printf '%s' "$run_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("url",""))')"
  if [[ "$status" == "completed" ]]; then
    [[ "$conclusion" == "success" ]] ||
      fail "release-validate: ${workflow} run ${run_id} completed with ${conclusion:-unknown}"
    break
  fi
  (( $(date +%s) < deadline )) ||
    fail "release-validate: ${workflow} run ${run_id} exceeded ${timeout_ms}ms"
  echo "release-validate: ${workflow} run ${run_id} is ${status:-pending}; sleeping ${poll_seconds}s"
  sleep "$poll_seconds"
done

emit_result "$run_id" "$run_url"
echo "KODY_SKIP_AGENT=true"

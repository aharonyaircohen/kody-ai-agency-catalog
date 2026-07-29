#!/usr/bin/env bash
set -euo pipefail

pr="${KODY_ARG_PR:-}"
workflow="${KODY_CFG_RELEASE_VALIDATION_WORKFLOW:-}"
input_prefix="KODY_CFG_RELEASE_VALIDATION_INPUTS_"

fail() {
  echo "KODY_REASON=$1"
  echo "KODY_SKIP_AGENT=true"
  exit "${2:-1}"
}

emit_result() {
  local status="$1"
  local summary="$2"
  local dispatched="$3"
  PR="$pr" WORKFLOW="$workflow" HEAD_SHA="$head_sha" STATUS="$status" \
    SUMMARY="$summary" DISPATCHED="$dispatched" python3 - <<'PY'
import json
import os

print("KODY_CAPABILITY_RESULT=" + json.dumps({
    "version": 1,
    "status": os.environ["STATUS"],
    "summary": os.environ["SUMMARY"],
    "evidence": {"releaseValidationRequested": True},
    "facts": {
        "validationPr": int(os.environ["PR"]),
        "validationWorkflow": os.environ["WORKFLOW"],
        "validationHeadSha": os.environ["HEAD_SHA"],
        "validationDispatched": os.environ["DISPATCHED"] == "true",
    },
}, separators=(",", ":")))
PY
}

[[ "$pr" =~ ^[0-9]+$ ]] || fail "release-validate: --pr is required" 99
[[ -n "$workflow" ]] || fail "release-validate: release.validation.workflow is required" 99

pr_view="$(gh pr view "$pr" --json state,headRefName,headRefOid 2>/dev/null)" ||
  fail "release-validate: PR #${pr} could not be read"
state="$(printf '%s' "$pr_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("state",""))')"
head_ref="$(printf '%s' "$pr_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("headRefName",""))')"
head_sha="$(printf '%s' "$pr_view" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("headRefOid",""))')"

[[ "$state" == "OPEN" ]] || fail "release-validate: PR #${pr} is not open (state: ${state:-unknown})"
[[ -n "$head_ref" && -n "$head_sha" ]] ||
  fail "release-validate: PR #${pr} has no resolvable head"

runs="$(gh run list --workflow "$workflow" --commit "$head_sha" --limit 20 \
  --json status,conclusion 2>/dev/null || printf '[]')"
reusable="$(RUNS="$runs" python3 - <<'PY'
import json
import os

runs = json.loads(os.environ["RUNS"] or "[]")
print("true" if any(
    row.get("status") in {"queued", "in_progress", "waiting", "requested"} or
    (row.get("status") == "completed" and row.get("conclusion") == "success")
    for row in runs
) else "false")
PY
)"

if [[ "$reusable" == "true" ]]; then
  emit_result "noop" "Validation already exists for release PR #${pr}" "false"
  echo "KODY_SKIP_AGENT=true"
  exit 0
fi

dispatch_args=()
while IFS='=' read -r name value; do
  key="${name#"$input_prefix"}"
  key="$(printf '%s' "$key" | tr '[:upper:]' '[:lower:]')"
  dispatch_args+=("-f" "${key}=${value}")
done < <(env | grep "^${input_prefix}" | sort)

gh workflow run "$workflow" --ref "$head_ref" "${dispatch_args[@]}" ||
  fail "release-validate: could not dispatch ${workflow} for ${head_ref}"

emit_result "changed" "Dispatched ${workflow} for release PR #${pr}" "true"
echo "KODY_SKIP_AGENT=true"

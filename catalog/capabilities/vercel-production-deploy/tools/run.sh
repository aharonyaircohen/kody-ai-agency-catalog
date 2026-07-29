#!/usr/bin/env bash
set -u

capability_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
log_file="$(mktemp)"
trap 'rm -f "$log_file"' EXIT

set +e
bash "$capability_dir/tools/scripts/vercel-production-deploy.sh" >"$log_file" 2>&1
script_status=$?
set -e

cat "$log_file" >&2

python3 - "$log_file" "$script_status" <<'PY'
import json
import sys

log_path = sys.argv[1]
script_status = int(sys.argv[2])
prefix = "KODY_CAPABILITY_RESULT="
result = None

with open(log_path, encoding="utf-8") as log:
    for raw_line in log:
        line = raw_line.strip()
        if not line.startswith(prefix):
            continue
        try:
            candidate = json.loads(line[len(prefix):])
        except json.JSONDecodeError:
            continue
        if isinstance(candidate, dict):
            result = candidate

if result is None:
    summary = f"Vercel production deploy exited {script_status} without a structured result"
    result = {
        "version": 1,
        "status": "fail",
        "summary": summary,
        "facts": {},
        "artifacts": [],
        "missingEvidence": ["productionDeployed"],
        "blockers": [summary],
    }

print(json.dumps(result, separators=(",", ":")))
PY

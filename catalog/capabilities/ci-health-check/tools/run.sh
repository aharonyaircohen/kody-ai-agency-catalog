set -euo pipefail

capability_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$capability_dir/tools/scripts/ci-health-check.mjs"

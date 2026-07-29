set -euo pipefail

capability_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec bash "$capability_dir/tools/scripts/release-deploy.sh"

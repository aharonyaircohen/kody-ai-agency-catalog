#!/usr/bin/env bash
set -euo pipefail
capability_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$capability_dir/tools/scripts/install-strategy-bundle.mjs"

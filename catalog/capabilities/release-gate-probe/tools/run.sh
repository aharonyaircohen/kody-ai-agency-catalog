#!/bin/sh
set -eu

owner="${KODY_CFG_GITHUB_OWNER:-}"
repo="${KODY_CFG_GITHUB_REPO:-}"

if [ -z "$owner" ] || [ -z "$repo" ]; then
  printf '%s\n' 'release-gate-probe requires github.owner and github.repo' >&2
  exit 64
fi

commit="$(git rev-parse HEAD)"
printf '{"status":"pass","repository":"%s/%s","commit":"%s"}\n' "$owner" "$repo" "$commit"

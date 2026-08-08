#!/usr/bin/env bash
set -euo pipefail

pr_number="${1:-}"
preview_url="${2:-}"

if [[ -z "${pr_number}" ]]; then
  echo "Usage: resolve-preview.sh <pr-number> [preview-url]" >&2
  exit 2
fi

if [[ -n "${preview_url}" ]]; then
  if [[ ! "${preview_url}" =~ ^https?:// ]]; then
    echo "Preview URL must use HTTP or HTTPS." >&2
    exit 2
  fi
  printf '%s\n' "${preview_url}"
  exit 0
fi

repository="${GITHUB_REPOSITORY:-}"
if [[ -z "${repository}" ]]; then
  echo "GITHUB_REPOSITORY is required to resolve a preview." >&2
  exit 2
fi

head_sha="$(gh pr view "${pr_number}" --repo "${repository}" --json headRefOid --jq '.headRefOid')"
deployment_ids="$(
  gh api "repos/${repository}/deployments?ref=${head_sha}&per_page=20" --jq '.[].id'
)"

while IFS= read -r deployment_id; do
  [[ -n "${deployment_id}" ]] || continue
  resolved_url="$(
    gh api "repos/${repository}/deployments/${deployment_id}/statuses?per_page=20" \
      --jq '[.[] | select(.state == "success") | (.environment_url // .target_url) | select(type == "string" and length > 0)][0] // empty'
  )"
  if [[ -n "${resolved_url}" ]]; then
    printf '%s\n' "${resolved_url}"
    exit 0
  fi
done <<< "${deployment_ids}"

echo "No successful preview deployment exists for PR #${pr_number} at ${head_sha}." >&2
exit 1

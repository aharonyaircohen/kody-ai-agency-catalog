#!/usr/bin/env bash
set -euo pipefail

repo="${GITHUB_REPOSITORY:-}"
if [[ -z "$repo" ]]; then
  owner="${KODY_CFG_GITHUB_OWNER:-}"
  name="${KODY_CFG_GITHUB_REPO:-}"
  [[ -n "$owner" && -n "$name" ]] || {
    printf '%s\n' 'claim-next-backlog-issue requires GITHUB_REPOSITORY or github.owner/github.repo' >&2
    exit 64
  }
  repo="$owner/$name"
fi

required_labels="${KODY_ARG_REQUIRED_LABELS:-[]}"
jq -e 'type == "array" and all(.[]; type == "string" and length > 0)' \
  <<<"$required_labels" >/dev/null

active_labels='["kody:building","kody:classifying","kody:researching","kody:planning","kody:running","kody:fixing","kody:fixing-ci","kody:resolving","kody:reviewing","kody:reviewing-ui","kody:syncing","kody:orchestrating"]'
actor="$(gh api user --jq .login)"

issue_is_eligible() {
  local issue_json="$1"
  local number title labels
  number="$(jq -r .number <<<"$issue_json")"
  title="$(jq -r .title <<<"$issue_json")"
  labels="$(jq -c '[.labels[].name]' <<<"$issue_json")"

  jq -e --argjson labels "$labels" --argjson required "$required_labels" --argjson active "$active_labels" '
    ($labels | index("kody:backlog")) != null and
    all($required[]; . as $label | ($labels | index($label)) != null) and
    ($labels | index("duplicate")) == null and
    all($active[]; . as $label | ($labels | index($label)) == null)
  ' <<<null >/dev/null || return 1

  local open_closing_prs
  open_closing_prs="$(gh api graphql \
    -F owner="${repo%%/*}" -F name="${repo#*/}" -F number="$number" \
    -f query='query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){issue(number:$number){closedByPullRequestsReferences(first:50){nodes{state}}}}}' \
    --jq '[.data.repository.issue.closedByPullRequestsReferences.nodes[] | select(.state == "OPEN")] | length')"
  [[ "$open_closing_prs" == "0" ]] || return 1

  gh run list --repo "$repo" --limit 100 --json status,event,displayTitle \
    | jq -e --arg title "$title" '.[] | select(
        (.status == "queued" or .status == "in_progress") and
        (.event == "issues" or .event == "issue_comment") and
        .displayTitle == $title
      )' >/dev/null && return 1

  local now_epoch
  now_epoch="$(date -u +%s)"
  while IFS= read -r body; do
        marker="$(grep -oE '<!-- kody:issue-resolution:v1 status=in-progress started=[^ ]+ -->' <<<"$body" || true)"
        [[ -n "$marker" ]] || continue
        started="${marker#*started=}"
        started="${started% -->}"
        started_epoch="$(date -u -d "$started" +%s 2>/dev/null || date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$started" +%s 2>/dev/null || printf 0)"
        (( now_epoch - started_epoch < 7200 )) && return 1
  done < <(
    gh api --paginate "repos/$repo/issues/$number/comments?per_page=100" \
      | jq -r --arg actor "$actor" '.[] | select(.user.login == $actor) | .body'
  )
}

issues="$(gh api --paginate "repos/$repo/issues?state=open&per_page=100" --slurp \
  | jq -c '[.[][] | select(.pull_request == null)] | sort_by(.number)[]')"

selected=''
while IFS= read -r issue; do
  [[ -n "$issue" ]] || continue
  if issue_is_eligible "$issue"; then
    selected="$issue"
    break
  fi
done <<<"$issues"

if [[ -z "$selected" ]]; then
  printf '%s\n' '{"status":"none","summary":"No eligible backlog issue was found."}'
  exit 0
fi

number="$(jq -r .number <<<"$selected")"
fresh="$(gh api "repos/$repo/issues/$number")"
issue_is_eligible "$fresh" || {
  printf '%s\n' '{"status":"none","summary":"The selected issue was no longer eligible when rechecked."}'
  exit 0
}

started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
marker="<!-- kody:issue-resolution:v1 status=in-progress started=$started -->"
body="$marker

Kody started preparing a pull request for this issue."
existing_comment="$(gh api --paginate "repos/$repo/issues/$number/comments?per_page=100" \
  --jq ".[] | select(.user.login == $(jq -Rn --arg value "$actor" '$value') and (.body | contains(\"<!-- kody:issue-resolution:v1\"))) | .id" \
  | head -n 1)"
if [[ -n "$existing_comment" ]]; then
  gh api --method PATCH "repos/$repo/issues/comments/$existing_comment" -f body="$body" >/dev/null
else
  gh api --method POST "repos/$repo/issues/$number/comments" -f body="$body" >/dev/null
fi

jq -cn --argjson issue "$number" \
  --arg summary "Claimed issue #$number and started preparing its pull request." \
  '{status:"claimed",issue:$issue,summary:$summary}'

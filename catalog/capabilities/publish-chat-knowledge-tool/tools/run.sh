#!/usr/bin/env bash
set -euo pipefail

input="${KODY_CAPABILITY_INPUT:-null}"
status="$(jq -er '.status' <<<"$input")"
if [[ "$status" != "built" ]]; then
  result='{"status":"blocked","summary":"Knowledge graph was not built","toolId":"company-understanding","enabled":false}'
  printf '%s\n' "$result"
  exit 1
fi

repository="${GITHUB_REPOSITORY:-${KODY_REPOSITORY:-}}"
[[ "$repository" == */* ]] || { printf 'FAILED: repository identity is required\n'; exit 1; }
owner="${repository%%/*}"
repo="${repository#*/}"
token="${KODY_TOKEN:-${GH_TOKEN:-${GITHUB_TOKEN:-}}}"
[[ -n "$token" ]] || { printf 'FAILED: Kody or GitHub token is required\n'; exit 1; }
dashboard="${KODY_DASHBOARD_URL:-https://kody-dashboard-khaki.vercel.app}"
dashboard="${dashboard%/}"
auth=(-H "x-kody-token: $token" -H "x-kody-owner: $owner" -H "x-kody-repo: $repo")

upload_url="$(curl --fail-with-body --silent --show-error -X POST "${auth[@]}" "$dashboard/api/kody/chat-tools" | jq -er .uploadUrl)"
storage_id="$(curl --fail-with-body --silent --show-error -X POST -H "Content-Type: application/json" --data-binary "$input" "$upload_url" | jq -er .storageId)"
generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
body="$(jq -nc \
  --arg dataStorageId "$storage_id" \
  --arg generatedAt "$generated_at" \
  --argjson nodeCount "$(jq '.graph.nodes | length' <<<"$input")" \
  --argjson edgeCount "$(jq '.graph.edges | length' <<<"$input")" \
  '{
    toolId: "company-understanding",
    name: "search_company_knowledge",
    title: "Company knowledge",
    description: "Search evidence-backed knowledge about the company, project, repository, data, current work, and AI agency.",
    handlerKind: "knowledge_graph_search",
    dataStorageId: $dataStorageId,
    dataSchemaVersion: 1,
    sourceWorkflow: "build-chat-knowledge-graph",
    generatedAt: $generatedAt,
    nodeCount: $nodeCount,
    edgeCount: $edgeCount
  }')"
curl --fail-with-body --silent --show-error -X PUT "${auth[@]}" -H "Content-Type: application/json" --data "$body" "$dashboard/api/kody/chat-tools" | jq -e '.ok == true' >/dev/null

result='{"status":"published","summary":"Company knowledge is available in Chat Tools and remains disabled until a user enables it.","toolId":"company-understanding","enabled":false}'
printf '%s\n' "$result"

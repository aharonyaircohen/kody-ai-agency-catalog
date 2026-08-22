#!/usr/bin/env bash
set -euo pipefail

dry_run="${KODY_ARG_DRY_RUN:-false}"
tag="${KODY_ARG_TAG:-latest}"
access="${KODY_ARG_ACCESS:-public}"
registry="${NPM_CONFIG_REGISTRY:-https://registry.npmjs.org/}"

emit_result() {
  local status="$1"
  local summary="$2"
  local evidence_key="${3:-}"
  local blocker="${4:-}"
  STATUS="$status" SUMMARY="$summary" EVIDENCE_KEY="$evidence_key" BLOCKER="$blocker" \
    PACKAGE_NAME="${pkg_name:-}" PACKAGE_VERSION="${pkg_version:-}" PACKAGE_TAG="$tag" \
    node <<'JS'
const status = process.env.STATUS
const evidenceKey = process.env.EVIDENCE_KEY
const blocker = process.env.BLOCKER
const packageName = process.env.PACKAGE_NAME
const packageVersion = process.env.PACKAGE_VERSION
const packageTag = process.env.PACKAGE_TAG
const packageUrl = packageName ? `https://www.npmjs.com/package/${packageName}` : ""
const facts = {}
if (packageName) facts.packageName = packageName
if (packageVersion) facts.packageVersion = packageVersion
if (packageTag) facts.packageTag = packageTag
if (packageUrl) facts.packageUrl = packageUrl
process.stdout.write(JSON.stringify({
  version: 1,
  status,
  summary: process.env.SUMMARY,
  evidence: evidenceKey ? { [evidenceKey]: true } : {},
  facts,
  artifacts: packageUrl ? [{ label: `${packageName}@${packageVersion}`, url: packageUrl }] : [],
  missingEvidence: status === "fail" ? ["packagePublished"] : [],
  blockers: blocker ? [blocker] : [],
}))
JS
}

fail() {
  emit_result "fail" "$1" "" "$1"
  exit 0
}

[[ -f package.json ]] || { fail "npm publish: package.json not found"; exit 0; }

pkg_name="$(node -e "const p=require('./package.json'); if(!p.name) process.exit(1); process.stdout.write(p.name)" 2>/dev/null || true)"
pkg_version="$(node -e "const p=require('./package.json'); if(!p.version) process.exit(1); process.stdout.write(p.version)" 2>/dev/null || true)"
[[ -n "$pkg_name" ]] || { fail "npm publish: package.json missing name"; exit 0; }
[[ -n "$pkg_version" ]] || { fail "npm publish: package.json missing version"; exit 0; }

if [[ "$access" != "public" && "$access" != "restricted" ]]; then
  fail "npm publish: access must be public or restricted"
  exit 0
fi
if [[ ! "$tag" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  fail "npm publish: invalid npm tag"
  exit 0
fi

echo "npm publish: ${pkg_name}@${pkg_version} tag=${tag} access=${access}" >&2

if [[ "$dry_run" == "true" ]]; then
  emit_result "pass" "Would publish ${pkg_name}@${pkg_version} to npm with tag ${tag}." "packagePublishDryRun"
  exit 0
fi

has_oidc="false"
if [[ -n "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" && -n "${ACTIONS_ID_TOKEN_REQUEST_TOKEN:-}" ]]; then
  has_oidc="true"
fi
if [[ "$has_oidc" != "true" && -z "${NPM_TOKEN:-}" ]]; then
  fail "npm publish: no publish authentication; configure GitHub OIDC or provide NPM_TOKEN"
  exit 0
fi

if npm view "${pkg_name}@${pkg_version}" version --registry "$registry" >/dev/null 2>&1; then
  emit_result "pass" "${pkg_name}@${pkg_version} is already published." "packagePublished"
  exit 0
fi

tmp_npmrc="$(mktemp)"
cleanup() {
  rm -f "$tmp_npmrc"
}
trap cleanup EXIT

chmod 600 "$tmp_npmrc"
printf '%s\n' "registry=${registry}" >"$tmp_npmrc"
if [[ "$has_oidc" != "true" ]]; then
  registry_host="${registry#https://}"
  registry_host="${registry_host#http://}"
  printf '%s\n' "//${registry_host%/}/:_authToken=${NPM_TOKEN}" >>"$tmp_npmrc"
fi
export NPM_CONFIG_USERCONFIG="$tmp_npmrc"
export HUSKY=0
export SKIP_HOOKS=1
export CI="${CI:-1}"

publish_args=(publish --access "$access" --tag "$tag" --registry "$registry")
set +e
npx --yes npm@11.19.0 "${publish_args[@]}" >&2
publish_status=$?
set -e

if [[ "$publish_status" -ne 0 ]]; then
  fail "npm publish: command failed with exit ${publish_status}"
  exit 0
fi

emit_result "pass" "Published ${pkg_name}@${pkg_version} to npm with tag ${tag}." "packagePublished"

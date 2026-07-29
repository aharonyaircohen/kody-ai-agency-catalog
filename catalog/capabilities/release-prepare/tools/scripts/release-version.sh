release_version_validate_configuration() {
  local read_command="${KODY_CFG_RELEASE_VERSION_READCOMMAND:-}"
  local write_command="${KODY_CFG_RELEASE_VERSION_WRITECOMMAND:-}"
  local files="${KODY_CFG_RELEASE_VERSION_FILES:-}"

  if [[ -z "$read_command" && -z "$write_command" && -z "$files" ]]; then
    return
  fi
  if [[ -z "$read_command" || -z "$write_command" || -z "$files" ]]; then
    echo "release version: readCommand, writeCommand, and files must be configured together" >&2
    return 99
  fi
}

release_version_read() {
  local root="${1:-.}"
  release_version_validate_configuration || return
  if [[ -n "${KODY_CFG_RELEASE_VERSION_READCOMMAND:-}" ]]; then
    (cd "$root" && bash -eo pipefail -c "$KODY_CFG_RELEASE_VERSION_READCOMMAND")
    return
  fi
  python3 - "$root/package.json" <<'PY'
import json
import sys

with open(sys.argv[1]) as file:
    version = json.load(file).get("version")
if not isinstance(version, str) or not version.strip():
    raise SystemExit("release version: package.json must contain a version string")
print(version.strip())
PY
}

release_version_files() {
  release_version_validate_configuration || return
  local configured="${KODY_CFG_RELEASE_VERSION_FILES:-${KODY_CFG_RELEASE_VERSIONFILES:-}}"
  if [[ -z "$configured" ]]; then
    printf '%s\n' "package.json"
    return
  fi
  VERSION_FILES="$configured" python3 - <<'PY'
import json
import os

files = json.loads(os.environ["VERSION_FILES"])
if not isinstance(files, list) or not files:
    raise SystemExit("release version: files must be a non-empty JSON array")
for file in files:
    if not isinstance(file, str) or not file.strip():
        raise SystemExit("release version: files must contain non-empty strings")
    print(file.strip())
PY
}

release_version_write() {
  local root="${1:-.}"
  local new_version="$2"
  release_version_validate_configuration || return
  if [[ -n "${KODY_CFG_RELEASE_VERSION_WRITECOMMAND:-}" ]]; then
    (cd "$root" && KODY_RELEASE_VERSION="$new_version" \
      bash -eo pipefail -c "$KODY_CFG_RELEASE_VERSION_WRITECOMMAND")
    return
  fi
  while IFS= read -r file; do
    python3 - "$root/$file" "$new_version" <<'PY'
import json
import sys

path, version = sys.argv[1:]
with open(path) as source:
    data = json.load(source)
data["version"] = version
with open(path, "w") as destination:
    json.dump(data, destination, indent=2)
    destination.write("\n")
PY
  done < <(release_version_files)
}

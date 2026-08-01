# NPM Publish

Publish the current package version to npm after the release pull request has
merged. Publishing is idempotent: an existing package version is reported as
complete without publishing it again.

## Input

- `dryRun` (boolean): report what would be published without writing to npm.
- `tag` (string): npm distribution tag. Defaults to `latest`.
- `access` (`public` or `restricted`): package access. Defaults to `public`.

`NPM_TOKEN` is required for a real publish and must come from the repository's
runtime secrets.

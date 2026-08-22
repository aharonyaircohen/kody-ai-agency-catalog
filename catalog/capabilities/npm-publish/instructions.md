# NPM Publish

Publish the current package version to npm after the release pull request has
merged. Publishing is idempotent: an existing package version is reported as
complete without publishing it again.

## Input

- `dryRun` (boolean): report what would be published without writing to npm.
- `tag` (string): npm distribution tag. Defaults to `latest`.
- `access` (`public` or `restricted`): package access. Defaults to `public`.

Real publishing prefers npm Trusted Publishing. The consumer workflow should
grant the job `id-token: write`, and the runtime must have npm 11.5.1 or newer.
Until the package has a Trusted Publisher configured, `NPM_TOKEN` remains a
transitional fallback so release flows do not stop for npm account setup.

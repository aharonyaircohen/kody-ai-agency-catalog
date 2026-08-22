# NPM Publish

Publish the current package version to npm after the release pull request has
merged. Publishing is idempotent: an existing package version is reported as
complete without publishing it again.

## Input

- `dryRun` (boolean): report what would be published without writing to npm.
- `tag` (string): npm distribution tag. Defaults to `latest`.
- `access` (`public` or `restricted`): package access. Defaults to `public`.

Real publishing uses npm Trusted Publishing. The consumer workflow must grant
the job `id-token: write`, and the runtime must have npm 11.5.1 or newer. No
long-lived npm token or 2FA seed is needed.

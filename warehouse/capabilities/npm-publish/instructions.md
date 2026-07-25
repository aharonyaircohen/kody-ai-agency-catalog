# NPM Publish

Publish the current package version to npm using the engine's built-in
`npm-publish` implementation.

This capability is manual. It expects `NPM_TOKEN` to be available in the workflow
environment. Use `--dry-run true` to verify the publish path without writing to
npm.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `dry-run` (boolean): Print the publish plan without requiring NPM_TOKEN or publishing.
- `tag` (string): npm dist-tag to publish under. Defaults to latest.
- `access` (string): npm package access. Defaults to public.
- `issue` (integer): Issue/PR number to post terminal notice on.

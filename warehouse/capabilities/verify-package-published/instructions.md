# Verify Package Published

## Purpose

Confirm a package version is visible in the npm registry.

## Contract

- Input is package name and version, or package.json in the working tree.
- Verify npm can resolve that exact version.
- Report pass/fail evidence to a managed goal when `--goal` is provided.
- Do not publish.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `package` (string): Package name. Defaults to package.json name.
- `version` (string): Package version. Defaults to package.json version.
- `goal` (string): Managed goal id to report publish evidence to.
- `evidence` (string): Evidence key to set on the goal. Default packagePublished.

# Release State

## Purpose

Observe the current release state without changing anything.

## Contract

- Read package version, release PR, tag, and optional package registry state.
- Return facts that a release goal can use to choose the next step.
- Do not create PRs, tags, releases, or deploys.

## Output

Facts such as current version, release PR number, release tag, and publish state.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `goal` (string): Managed goal id to report release-state evidence to.
- `evidence` (string): Evidence key to set on the goal. Default releaseStateObserved.
- `package` (string): Package name to check in npm. Defaults to package.json name.

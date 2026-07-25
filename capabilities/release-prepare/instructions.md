# Release Prepare

## Purpose

Prepare a release PR.

## Instructions

Follow these instructions and use the capability-owned files in `tools/` when needed.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `bump` (string): Version bump increment. Default patch.
- `dry-run` (boolean): Print plan without writing files, committing, or opening a PR.
- `prefer` (string): On release/vX.Y.Z branch collision: 'ours' force-pushes; 'theirs' reuses the existing PR. Default refuses non-ff.
- `issue` (integer): Issue/PR number to post the terminal notice on. Auto-injected by dispatch.
- `goal` (string): Managed goal id to report release PR evidence to.

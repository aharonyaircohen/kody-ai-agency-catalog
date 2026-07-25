# Release Promote

## Purpose

Promote the default branch to the configured release branch through a pull request.

## Instructions

Use the capability-owned files in `tools/` for the mechanical pull request work.
The capability owns the public release-promotion contract and evidence.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `dry-run` (boolean): Print plan without running deploy/notify commands.
- `issue` (integer): Issue/PR number post terminal notice on. Auto-injected by dispatch.
- `goal` (string): Managed goal id to report promotion PR evidence to.

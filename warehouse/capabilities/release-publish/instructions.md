# Release Publish

## Purpose

Publish a prepared release.

## Instructions

Follow these instructions and use the capability-owned files in `tools/` when needed.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `dry-run` (boolean): Print plan without tagging or publishing.
- `issue` (integer): Issue/PR number post terminal notice on. Auto-injected by dispatch.
- `goal` (string): Managed goal id to report publish evidence to.

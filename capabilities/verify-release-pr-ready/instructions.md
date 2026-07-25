# Verify Release PR Ready

## Purpose

Confirm a release PR is ready for the next release step.

## Contract

- Input is a PR number.
- Verify the PR exists, is open, is not draft, and has no failing or pending checks.
- Report pass/fail evidence to a managed goal when `--goal` is provided.
- Do not merge or edit the PR.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `pr` (integer, needed): Release pull request number.
- `goal` (string): Managed goal id to report readiness evidence to.
- `evidence` (string): Evidence key to set on the goal. Default releasePrReady.

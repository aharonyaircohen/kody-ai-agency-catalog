# PR Revert

## Job

Revert a merged pull request when explicitly requested.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

A revert branch or pull request that undoes the target merge.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Run only on explicit revert requests.
- Treat this as destructive.
- Do not revert unrelated commits.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `pr` (integer, needed): GitHub PR number whose branch to revert commits on.
- `shas` (string, needed): One or more commit SHAs (whitespace-separated) to revert. Each must exist in the PR branch's history.

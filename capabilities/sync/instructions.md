# PR Branch Sync

## Job

Bring a pull request branch up to date with its base branch.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

An updated pull request branch.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Only sync the target pull request branch.
- Do not add unrelated code changes.
- Do not merge the pull request from this capability.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `pr` (integer, needed): GitHub PR number to update from its base branch.

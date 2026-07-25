# Release Merge

## Purpose
Merge a prepared release PR after checks pass.

## Instructions
Follow these instructions and use the capability-owned files in `tools/` when needed.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `pr` (integer, needed): Release pull request number to merge.
- `issue` (integer): GitHub issue number to work on.
- `goal` (string): Managed goal id to report merge evidence to.
- `timeout-seconds` (integer): Maximum seconds to wait for pending checks before failing. Default 1800.
- `poll-seconds` (integer): Seconds between CI polls while waiting. Default 30.

# Merge

## Purpose

Self-gating squash merge of a PR.

## Instructions

Follow these instructions and use the capability-owned files in `tools/` when needed.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `pr` (integer, needed): GitHub PR number to merge.

Before merging, independently confirm that required checks passed, the review
verdict passed, the PR is mergeable, and merge permission was approved. If any
gate is missing, do not merge and return a blocked JSON result.

When every gate passes, mark the draft ready and squash-merge it. Return exactly
one JSON object with `status`, `merged`, `pr`, and `summary`. Use status
`merged` only after GitHub confirms the merge. Use status `blocked` whenever a
gate prevents the merge.

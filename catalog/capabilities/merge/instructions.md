# Merge

## Purpose

Self-gating squash merge of a PR.

## Instructions

Follow these instructions and use the capability-owned files in `tools/` when needed.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `pr` (integer, needed): GitHub PR number to merge.
- `headSha` (string, needed): exact commit approved by the final review.
- `verdict` (string, needed): code review result; must be `pass`.
- `status` (string, optional): UI review result; when supplied, must be `pass`.

Before merging, independently confirm that required checks passed, the review
result passed, `headSha` equals the current PR head, and the PR is mergeable.
The already-authorized capability call is the merge permission; do not require
a separate GitHub approving review when the supplied review result is `pass`.
If any gate is missing, do not merge and return a blocked JSON result.

When every gate passes, mark the draft ready and squash-merge it. Return exactly
one JSON object with `status`, `merged`, `pr`, and `summary`. Use status
`merged` only after GitHub confirms the merge. Use status `blocked` whenever a
gate prevents the merge.

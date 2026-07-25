# Merge

## Purpose

Self-gating squash merge of a PR.

## Instructions

Follow these instructions and use the capability-owned files in `tools/` when needed.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `pr` (integer, needed): GitHub PR number to merge. No-op (MERGE_SKIPPED) if already closed/merged; refuses (MERGE_BLOCKED) if draft, conflicting, or not yet CLEAN.

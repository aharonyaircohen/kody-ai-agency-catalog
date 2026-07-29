# Release Validate

Explicitly dispatch and await the repository-owned validation workflow for a
prepared release pull request.

This capability owns dispatch and the exact validation-run result. The
repository workflow owns its tests, and `release-merge` owns only the later PR
merge boundary.

## Input

- `pr` (integer, required): prepared release pull request number.

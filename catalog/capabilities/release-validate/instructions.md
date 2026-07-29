# Release Validate

Explicitly dispatch the repository-owned validation workflow for a prepared
release pull request.

This capability owns only the dispatch boundary. The repository workflow owns
its tests, and `release-merge` owns waiting for those checks and enforcing their
result.

## Input

- `pr` (integer, required): prepared release pull request number.

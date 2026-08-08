# CI Health Check

Read GitHub CI state without editing repository files.

This Capability is deterministic. Its script reads GitHub Actions, ignores
Kody's own orchestration workflow, and returns exactly one JSON object:

```json
{
  "status": "red",
  "needsRepair": true,
  "pr": 456,
  "prUrl": "https://github.com/owner/repo/pull/456",
  "failedChecks": ["test"],
  "runUrl": "https://github.com/owner/repo/actions/runs/123",
  "summary": "CI is red"
}
```

For a pull request, it reads that PR's current checks. Otherwise it reads the
latest default-branch commit with repository CI. It never creates repair state,
starts another Capability, or changes code.

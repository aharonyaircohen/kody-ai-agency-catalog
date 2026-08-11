# CI Health Check

Read GitHub CI state without editing repository files.

When `runId`, `branch`, and `headSha` are supplied, inspect that exact run and
return its failed log evidence. This works whether or not the run belongs to a
pull request.

This Capability is deterministic. Its script reads GitHub Actions, ignores
Kody's own orchestration workflow, and returns exactly one JSON object. For a
red pull request it also returns bounded `failureLog` evidence from the exact
failed run. If that evidence cannot be read, it returns `blocked` instead of
asking a repair agent to guess.

```json
{
  "status": "red",
  "needsRepair": true,
  "pr": 456,
  "prUrl": "https://github.com/owner/repo/pull/456",
  "failedChecks": ["test"],
  "runId": 123,
  "runUrl": "https://github.com/owner/repo/actions/runs/123",
  "failureLog": "AssertionError: expected true to be false",
  "summary": "CI is red"
}
```

For a pull request without an exact run, it reads that PR's current checks.
Without either form of input, it reads the latest default-branch commit with
repository CI. It never creates repair state, starts another Capability, or
changes code.

When `waitForCompletion` is true, it keeps observing the current PR head until
CI is healthy, red, or the bounded `timeoutSeconds` limit is reached. A timeout
returns `blocked`; it never guesses that a pending run failed.

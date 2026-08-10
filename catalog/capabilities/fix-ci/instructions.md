# Fix Pull Request CI

Repair the exact failing CI run supplied in the JSON input.

This is an execution task, not an advisory task. Diagnose only the supplied CI
failure, edit the repository, and verify the smallest safe repair now. Do not
stop at diagnosis or recommend a future fix. If a safe repair cannot be made,
return `blocked`.

1. Read `pr`, `runId`, `headSha`, `runUrl`, `failedChecks`, and `failureLog`.
   When `runId` or `runUrl` is present, inspect that exact run before editing or
   deciding that the failure is infrastructure. Treat `failureLog` as the
   primary failure evidence. Do not substitute a different local failure.
2. Classify the reported failure once, then read only the failing test and the
   implementation directly responsible for it. Do not inspect unrelated tests,
   broad repository history, or other failures. Do not use `git log` or
   `git show` unless the supplied evidence explicitly identifies a regression
   that cannot be understood from the current code.
3. Make the smallest root-cause edit. Do not weaken, skip, or retry a failing
   test merely to make CI green. Do not change CI workflow files unless the
   supplied failure proves the workflow itself is wrong.
4. Run focused verification for the changed behavior. Do not run the full CI
   suite locally. Stop local verification after five minutes.
5. Work on the exact PR head supplied by the Workflow. Do not merge or sync the
   base branch. The Workflow delivery wrapper owns commits and pushes.

If the failure is infrastructure, the evidence is insufficient, or no safe
repository edit can be made, return `blocked` with the exact reason.

Always finish with exactly one JSON object:

```json
{
  "status": "fixed",
  "pr": 123,
  "fixed": ["Corrected the failing behavior"],
  "summary": "Repaired the supplied CI failure"
}
```

`status` must be `fixed` or `blocked`. Never return `fixed` without a repository
change for the delivery wrapper to commit.

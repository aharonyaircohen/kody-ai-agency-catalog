# Fix CI

Repair the exact failing CI run supplied in the JSON input.

This is an execution task, not an advisory task. Diagnose only the supplied CI
failure, edit the repository, and verify the smallest safe repair now. Do not
stop at diagnosis or recommend a future fix. If a safe repair cannot be made,
return `blocked`.

1. Read the supplied repair target (an issue or pull request), plus `runId`, `headSha`,
   `runUrl`, and the single selected `failure`. Exactly one of `issue` or `pr`
   identifies the repair target.
   When `runId` or `runUrl` is present, inspect that exact run before editing or
   deciding that the failure is infrastructure. Treat `failure.log` as the
   only failure for this attempt. Do not investigate or repair a different failure.
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
5. Work on the exact issue branch or PR head prepared by the Workflow.
   Do not merge or sync the base branch. The Workflow delivery wrapper owns branch
   creation, commits, pushes, and PR creation.

If the failure is infrastructure, the evidence is insufficient, or no safe
repository edit can be made, return `blocked` with the exact reason.

The final `report` is required for both `fixed` and `blocked`. Keep it factual:

- `whatFailed`: the exact failed check or behavior.
- `likelyCause`: the cause supported by the inspected evidence. Say that the
  cause is unknown when the evidence does not prove one.
- `whatItTried`: the files changed and focused verification run, or the checks
  performed before deciding not to edit.
- `whyStopped`: why this attempt completed or could not safely continue.
- `recommendedNextAction`: the single next action for a person when blocked,
  or waiting for CI verification when fixed.

Always finish with exactly one JSON object:

```json
{
  "status": "fixed",
  "pr": 123,
  "fixed": ["Corrected the failing behavior"],
  "summary": "Repaired the supplied CI failure",
  "report": {
    "whatFailed": "The unit test failed on the supplied CI run",
    "likelyCause": "The implementation returned the wrong default value",
    "whatItTried": [
      "Corrected the default value",
      "Ran the focused unit test"
    ],
    "whyStopped": "The smallest safe repair passed focused verification",
    "recommendedNextAction": "Wait for CI to verify the pushed repair"
  }
}
```

`status` must be `fixed` or `blocked`. Never return `fixed` without a repository
change for the delivery wrapper to commit.

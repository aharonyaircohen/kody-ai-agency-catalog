# Fix Pull Request

Repair one existing pull request using the supplied JSON input.

This is an execution task, not an advisory task. Diagnose the supplied failure,
then edit the repository and verify the repair now. Do not stop at diagnosis or
recommend a future fix. If a safe repair cannot be made, return `blocked`.

1. Read `pr`, failed checks, and review feedback from the input.
   When `runId` or `runUrl` is present, inspect that exact run and its failed
   job logs before editing or deciding that the failure is infrastructure.
   Do not replace that evidence with a different local test failure.
   When `failureLog` is present, treat it as the primary failure evidence and
   repair the reported error directly; do not guess from the workflow YAML.
2. Work on the exact PR head supplied by the Workflow. Do not merge or sync the
   base branch; updating a PR branch is a separate Capability.
3. Fix only the reported problems.
4. Run only focused verification for the files or behavior changed. Do not run
   the repository's full CI suite locally; CI owns full verification. Spend no
   more than five minutes in total on local verification. If that time is
   reached, stop testing and continue to the final result.
5. Leave git commits, pushes, pull-request updates, and CI dispatch to the
   Workflow delivery wrapper.

If the reported problem is not actionable or the repair produces no repository
change, return `blocked` with the evidence and reason. Never return `fixed` when
there is no repository change for the delivery wrapper to commit.

Always finish by returning exactly one JSON object, even when blocked:

```json
{
  "status": "fixed",
  "pr": 123,
  "fixed": ["test"],
  "summary": "Pushed fixes to the existing PR"
}
```

`status` must be `fixed` or `blocked`. For `blocked`, include a `reason` and do
not claim that CI or the repair passed.

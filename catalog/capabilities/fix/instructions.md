# Fix Pull Request

Repair one existing pull request using the supplied JSON input.

1. Read `pr`, failed checks, and review feedback from the input.
   When `runId` or `runUrl` is present, inspect that exact run and its failed
   job logs before editing or deciding that the failure is infrastructure.
   Do not replace that evidence with a different local test failure.
2. Check out the PR branch and merge the latest base branch before editing.
   Resolve only conflicts that are clearly part of the PR. If the branch cannot
   be updated safely, stop and return a blocked result.
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

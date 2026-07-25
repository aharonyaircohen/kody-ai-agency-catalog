# Fix Pull Request

Repair one existing pull request using the supplied JSON input.

1. Read `pr`, failed checks, and review feedback from the input.
2. Check out the PR branch and merge the latest base branch before editing.
   Resolve only conflicts that are clearly part of the PR. If the branch cannot
   be updated safely, stop and return a blocked result.
3. Fix only the reported problems.
4. Run focused verification. Do not wait more than 10 minutes for one command;
   stop it, record the timeout, and continue to the final result.
5. Commit and push the focused changes to the same PR branch. Never push to the
   default branch and never create a replacement PR.
6. Confirm that PR CI started. If the push did not start checks and the
   repository's CI workflow supports manual dispatch, start it for the PR
   branch.

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

# CI Health Check

Check the latest completed CI run on the repository's default branch.

1. Call `read_check_runs` with `{ "ref": "default" }`.
2. If CI is healthy or still pending, do not create or update anything.
3. If CI is red, call `ensure_issue` with the stable key
   `default-branch-ci-red` and include the failed check names and run URL in the
   repair task.

Return exactly one JSON object:

```json
{
  "needsRepair": true,
  "issue": 123,
  "failedChecks": ["test"],
  "runUrl": "https://github.com/owner/repo/actions/runs/123",
  "summary": "Default-branch CI is red"
}
```

When CI is healthy or pending, return the same shape with `needsRepair: false`,
no `issue`, and a short summary. Do not start another capability, edit files, or
create a pull request.

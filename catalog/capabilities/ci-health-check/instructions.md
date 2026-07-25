# CI Health Check

Read CI state without editing repository files.

The input may contain a `pr` number. When it does, inspect that pull request's
current check runs. When `pr` is present, wait while its checks are pending.
Check again at sensible intervals until they finish, for no more than 30
minutes in total. Do not run one blocking command for more than 10 minutes.
Otherwise inspect the latest **completed repository CI** run on the default
branch.

Ignore the current Kody run (`GITHUB_RUN_ID`), scheduled Loop runs, and other
Kody orchestration runs. They run the observer and are not the CI being
observed. A currently running observer must never hide the latest completed CI
failure.

For a default-branch failure, create or update one issue using the stable key
`default-branch-ci-red`. Include the failed check names and run URL. Do not
create an issue for a pull-request failure.

Return exactly one JSON object:

```json
{
  "status": "red",
  "needsRepair": true,
  "hasOpenPr": true,
  "issue": 123,
  "pr": 456,
  "prUrl": "https://github.com/owner/repo/pull/456",
  "failedChecks": ["test"],
  "runUrl": "https://github.com/owner/repo/actions/runs/123",
  "summary": "CI is red"
}
```

`status` must be `healthy`, `pending`, `red`, or `blocked`. Use `blocked` when
PR checks are still pending after 30 minutes, and explain that timeout in
`summary`. `needsRepair` is true only for `red`. `hasOpenPr` is true only when
an open repair PR was found. Include `issue`, `pr`, and `prUrl` only when known.
For a default-branch issue, reuse an open repair PR linked to that issue when
one exists. Do not start another capability or change code.

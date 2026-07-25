# CI Health Check

Read CI state without editing repository files.

The input may contain a `pr` number. When it does, inspect that pull request's
current check runs. Otherwise inspect the latest run on the default branch.

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

`status` must be `healthy`, `pending`, or `red`. `needsRepair` is true only for
`red`. `hasOpenPr` is true only when an open repair PR was found. Include
`issue`, `pr`, and `prUrl` only when known. For a default-branch issue, reuse an
open draft repair PR linked to that issue when one exists. Do not start another
capability or change code.

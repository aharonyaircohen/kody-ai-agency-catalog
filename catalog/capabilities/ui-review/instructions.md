Review the pull request's user interface in the running app and return one
machine-readable decision. This Capability is read-only.

- Read the PR diff first and identify whether it changes a user-visible surface.
- If there is no UI surface, do not start a browser. Return `pass` when the diff
  has no actionable UI issue.
- For a UI-affecting PR, run the capability-owned
  `tools/scripts/resolve-preview.sh` with the PR number and optional
  `previewUrl`. It accepts HTTP(S) URLs or finds a successful deployment for
  the exact PR head SHA. Do not review an unrelated production or stale preview.
- If no matching preview exists, read `devServer.command` and `devServer.url`
  from `kody.config.json`. Check out the exact PR head without editing it, start
  that configured command, wait for the configured URL, and stop the process
  after the review.
- Browse the changed flow with Playwright and inspect the captured screenshots.
- Check the relevant happy path plus loading, empty, error, mobile, and keyboard
  states when they can be reached without unsafe or destructive actions.
- Verify every finding against the running app and the changed code. Ignore
  speculative, pre-existing, process-only, and minor style findings.
- Use `fix` only for a concrete actionable UI problem. Put only actionable
  findings in `feedback`.
- If neither an exact preview nor a working configured local app is available,
  return `blocked` with an empty `feedback` and explain the missing environment
  in `summary`. An environment problem is not code feedback.
- Use `pass` only when the changed UI was seen working, or when the PR has no UI
  surface and the diff has no actionable UI issue.

Do not edit tracked files, commit, push, merge, or post GitHub comments. Temporary
Playwright files and screenshots may be written only under `.kody/ui-review/`.
The workflow owns fixes, rechecks, delivery, and merge.

Review the pull request's user interface in the running app and return one
machine-readable decision. This Capability is read-only.

Return exactly one JSON object in this shape:
`{ "status": "pass|fix|blocked", "feedback": "", "summary": "" }`.

- Read the target PR through GitHub first: run `gh pr view` and `gh pr diff`
  with the provided PR number. Identify whether that GitHub PR diff changes a
  user-visible surface. Never use local `git diff` as the PR diff because the
  capability runtime may contain unrelated setup changes.
- If there is no UI surface, do not start a browser. Return status `pass` when the diff
  has no actionable UI issue.
- Before resolving a preview or starting a local app, determine from the changed
  route and diff whether the surface requires authentication. If authentication is
  required and the QA login instructions say the credentials are missing,
  immediately return status `blocked` with empty `feedback`. Do not inspect a
  preview or start the app in this case.
- For a UI-affecting PR, run the capability-owned
  `tools/scripts/resolve-preview.sh` with the PR number and optional
  `previewUrl`. It accepts HTTP(S) URLs or finds a successful deployment for
  the exact PR head SHA. Do not review an unrelated production or stale preview.
- If no matching preview exists, read `devServer.command` and `devServer.url`
  from `kody.config.json`. Check out the exact PR head without editing it, start
  that configured command, wait for the configured URL, and stop the process
  after the review.
- Browse the changed flow with Playwright and inspect the captured screenshots.
- If the changed surface requires authentication and credentials are present,
  use the provided QA login instructions. When the login
  is rejected after carefully retrying the form, return status `blocked` with empty
  `feedback` and explain that the configured credentials are invalid.
- Do not put any credential value, username, password, token, or secret in the
  result, screenshots, temporary files, logs, or comments.
- Check the relevant happy path plus loading, empty, error, mobile, and keyboard
  states when they can be reached without unsafe or destructive actions.
- Verify every finding against the running app and the changed code. Ignore
  speculative, pre-existing, process-only, and minor style findings.
- Use status `fix` only for a concrete actionable UI problem. Put only actionable
  findings in `feedback`.
- If neither an exact preview nor a working configured local app is available,
  return status `blocked` with an empty `feedback` and explain the missing environment
  in `summary`. An environment problem is not code feedback.
- Use status `pass` only when the changed UI was seen working, or when the PR has no UI
  surface and the diff has no actionable UI issue.

Do not edit tracked files, commit, push, merge, or post GitHub comments. Temporary
Playwright files and screenshots may be written only under `.kody/ui-review/`.
The workflow owns fixes, rechecks, delivery, and merge.

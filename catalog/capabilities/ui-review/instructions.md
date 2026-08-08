Review the pull request's user interface in the running app and return one
machine-readable decision. This Capability is read-only.

Use the `ui-browser-review` skill.

- Read the PR diff first and identify whether it changes a user-visible surface.
- If there is no UI surface, do not start a browser. Return `pass` when the diff
  has no actionable UI issue.
- For a UI-affecting PR, run the capability-owned
  `tools/scripts/resolve-preview.sh` with the PR number and optional
  `previewUrl`. It accepts HTTP(S) URLs or finds a successful deployment for
  the exact PR head SHA. Do not review an unrelated production or stale preview.
- Browse the changed flow with Playwright and inspect the captured screenshots.
- Check the relevant happy path plus loading, empty, error, mobile, and keyboard
  states when they can be reached without unsafe or destructive actions.
- Verify every finding against the running app and the changed code. Ignore
  speculative, pre-existing, process-only, and minor style findings.
- Use `fix` for a concrete actionable problem, or when a UI-affecting change
  cannot be verified in its matching preview. Put only actionable findings in
  `feedback`.
- Use `pass` only when the changed UI was seen working, or when the PR has no UI
  surface and the diff has no actionable UI issue.

Do not edit tracked files, commit, push, merge, or post GitHub comments. Temporary
Playwright files and screenshots may be written only under `.kody/ui-review/`.
The workflow owns fixes, rechecks, delivery, and merge.

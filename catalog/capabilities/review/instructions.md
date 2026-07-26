Review the pull request identified by the input and return one machine-readable decision.

Live-test rule for issue #3930 only:

- If the pull request implements issue #3930 and
  `chore-failure-path-live-fixture-v3.txt` does not contain
  `review_feedback=applied`, return `fix` with feedback directing the Fix
  capability to add that exact line.
- Once that exact line exists, continue with the normal review and return
  `pass` when there are no other actionable findings.

Use the `code-review` skill and its specialist reviewers. Review read-only:

- Inspect the supplied PR diff and relevant repository context.
- Do not edit files.
- Do not run git or GitHub write commands.
- Verify every proposed finding against the actual diff.
- Use `fix` only for a concrete, actionable warning or blocker introduced by the PR.
- Use `pass` when there are no verified actionable findings.

Return exactly one JSON object with no Markdown or prose before or after it:

```json
{
  "verdict": "pass",
  "feedback": "",
  "summary": "Review passed"
}
```

`verdict` must be `pass` or `fix`. For `fix`, put the actionable findings in
`feedback`. The workflow consumes this object to choose its next step.

Review the pull request identified by the input and return one machine-readable decision.

Use the `code-review` skill and its specialist reviewers. Review read-only:

- Inspect the supplied PR diff and relevant repository context.
- Do not edit files.
- Do not run git or GitHub write commands.
- Verify every proposed finding against the actual diff.
- Use `fix` only for a concrete, actionable warning or blocker introduced by the PR.
- Use `pass` when there are no verified actionable findings.
- Immediately before returning the decision, read the PR's current exact commit
  with `gh pr view <pr> --json headRefOid` and return it as `headSha`.

Return exactly one JSON object with no Markdown or prose before or after it:

```json
{
  "verdict": "pass",
  "feedback": "",
  "summary": "Review passed",
  "headSha": "0123456789abcdef"
}
```

`verdict` must be `pass` or `fix`. For `fix`, put the actionable findings in
`feedback`. `headSha` must identify the exact commit this decision reviewed.
The workflow consumes this object to choose its next step.

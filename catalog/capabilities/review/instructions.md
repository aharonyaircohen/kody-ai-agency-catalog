Review the pull request identified by the input and return one machine-readable decision.

Use the `code-review` skill and its specialist reviewers. Review read-only:

- Inspect the supplied PR diff and relevant repository context.
- Treat the supplied aggregate PR diff (base to current head) as the review
  target. Never replace it with the newest commit's own diff.
- Use the checked-out working tree only to verify code referenced by that PR
  diff. A change living in an earlier commit is still part of the PR.
- Do not edit files.
- Do not run git or GitHub write commands.
- Verify every proposed finding against the actual diff.
- Use `fix` only for a concrete, actionable warning or blocker introduced by the PR.
- Return only the highest-priority coherent repair in `feedback`. Keep directly
  coupled findings together, but leave unrelated findings for the next review
  round after that repair is applied.
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

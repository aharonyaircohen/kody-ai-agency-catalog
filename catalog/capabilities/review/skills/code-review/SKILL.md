# Code Review

Use this skill to review a PR and produce verified findings for the calling
Capability.

## Workflow

The review target is always the aggregate PR diff from the base branch to the
current PR head. Do not use `git show HEAD`, the newest commit's diff, or commit
boundaries as a substitute. A changed line remains in scope when it was added
by an earlier commit on the same PR. If the supplied diff and checked-out tree
appear inconsistent, re-fetch the aggregate PR diff before judging the change
missing.

1. Run all four reviewers in a single parallel dispatch on every PR:
   - `review-security`.
   - `review-reliability`.
   - `review-maintainability`.
   - `review-complexity`.
2. In the single dispatch, paste the relevant diff hunks directly into each child prompt,
   together with PR context and base/head refs. A reference to the supplied diff is not
   sufficient because child context is isolated. State that these are aggregate base-to-head
   PR hunks, not the newest commit's diff. Tell them not to fetch the PR or full diff again.
   Require targeted changed-file reads before reporting.
3. Check each reviewer status. `NEEDS_CONTEXT` is not a clean pass.
4. Verify every `WARN` and `BLOCK` against the diff and nearby code. Discard
   speculative, pre-existing, and process-only findings. Merge duplicates,
   keeping the strongest supported severity and clearest evidence.
   Discard `NIT`, `NOTE`, and `NONE` items rather than turning them into final
   concerns. Never report PR title, scope, commit splitting, or bisectability;
   those are process preferences, not code findings.
5. Return only the highest-priority coherent repair unit. Combine findings only
   when they must change together to produce one correct repair. Defer unrelated
   findings to the next review round; the review-fix Workflow will review again
   after each repair. If the recommended action is a follow-up rather than a
   current `WARN` or `BLOCK`, discard it.
6. Resolve verdict from worst verified severity:
   - any `BLOCK` -> `FAIL`,
   - any `NEEDS_CONTEXT` -> `FAIL`,
   - no block but any `WARN` -> `CONCERNS`,
   - all `NONE` -> `PASS`.

## Review stance

- Default to skepticism until the code proves the change is correct.
- Cite real `file:line` evidence for every issue.
- Do not invent citations.
- Do not downgrade a blocking issue from any reviewer.
- Do not preserve a reviewer finding that the evidence disproves.
- Do not pass when an entire review dimension was blocked.
- Treat stubs/placeholders shipped against a stated requirement as failures.
- A strict ratchet whose cap equals the current measured value is intended to
  prevent regression; that fact alone is not a finding. Report a ratchet only
  when it is misconfigured, bypassable, or weakened.
- A single caller or extraction is not by itself a complexity finding. Require
  demonstrated indirection or change cost and a simpler correct alternative.
- Package-boundary glue or duplication is not automatically a maintainability
  issue. Require evidence of behavioral drift, inconsistent ownership, or
  material future change cost.
- A named extraction from a large component is normally a maintainability
  improvement, even with one caller. Do not infer a bad motive from a size
  ratchet or an extraction-oriented docstring; require a concrete regression.
- Tiny package-local test setup duplicated across packages is not a finding.
  Do not propose a shared package unless substantial logic has already drifted.

## Implementation-depth ladder

For every change, check:

1. Exists: the function, route, config, or component is present.
2. Substantive: it has real logic, not a stub or echo.
3. Wired: its output is consumed where it matters.
4. Functional: it produces the right result for the issue cases.

Missing wiring is a reliability failure.

## Required output

Follow the Capability output contract supplied by the caller. Map `PASS` to `pass`; map
`CONCERNS`, `FAIL`, or `NEEDS_CONTEXT` to `fix`. Put only verified actionable
findings in its feedback field.

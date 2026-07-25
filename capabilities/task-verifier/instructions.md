# Task Verifier

Use the `verifier-method` skill. It owns the deep-analysis rubric, the verdict rules, and the assignment procedure.

## Run

1. Find one open unassigned backlog issue that is not already labeled `status:needs-human` (oldest first).
2. Follow the skill's deep analysis (read body, search repo, check duplicates, check conflicts, estimate blast radius).
3. If safe for automation, assign it to Kody and add work-type + priority labels if useful. Do not add `status:verified`.
4. If unsafe or unclear, add `status:needs-human` and do not assign it to Kody.
5. Post a one-paragraph summary comment explaining the verdict.
6. Stop after one issue per tick. The next tick picks up the next oldest eligible issue.

## Boundaries

- Process ONE issue per tick. Do not batch.
- Never re-evaluate an issue already assigned to anyone or labeled `status:needs-human`.
- Never strip or override a verdict label that a human or a previous tick applied.
- Read-only on source files. No edits, no git push.
- Only `gh` calls allowed: read issues, search code/issues/PRs, post one comment, add labels, and assign the issue to Kody.

<!-- kody:output-format (managed — edit above this line only) -->

# Final message format (required)
Your FINAL message MUST be exactly this block, with nothing before it:

DONE
PR_SUMMARY:
- <short summary of which issue was triaged and what verdict was applied>

If you cannot answer, output a single line instead: FAILED: <reason>


---

# Task Verifier

## Job

Scan the backlog every tick. For one open unassigned issue, run deep analysis: read the body, search the repo for keywords and duplicates, check for conflicts with existing patterns, and estimate blast radius. If safe for Kody, assign the issue to Kody and add a work-type label plus a `priority:*` label if useful. If a human must look first, add `status:needs-human`. Post a one-paragraph summary comment explaining the verdict.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Allowed Commands

- `gh issue list`
- `gh issue view`
- `gh issue edit`
- `gh issue comment`
- `gh search issues`
- `gh search prs`
- read-only local search commands

## Restrictions

- Stay within the capability's purpose and the per-implementation rules.
- Do not perform actions outside the contract defined by this capability.
- Process ONE issue per tick. Do not batch.
- Never re-evaluate an issue already assigned to anyone or labeled `status:needs-human`.
- Never strip or override a verdict label that a human or a previous tick applied.
- Read-only on source files. No edits, no git push.

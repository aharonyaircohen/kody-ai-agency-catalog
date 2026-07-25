# Instructions

Use the `ceo-performance-review` skill.

Run only the work requested by the matching capability. Follow the capability profile metadata for agent, mentions, and safety limits. The owning goal or loop decides when this runs.

# Final message format (required)

Your final message must use this exact shape:

```
DONE
PR_SUMMARY:
- <short summary of what happened>
```

If you cannot complete the run, output one line instead:

```
FAILED: <reason>
```


---

# CEO Performance Review

## Job

Review every agent by the capabilities they own and the evidence those capabilities produce.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

Refresh `.kody/reports/ceo-performance-review.md`.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Diagnostic only.
- Do not edit capabilities, agent, issues, or PRs.
- Do not dispatch work.
- Keep the report stable when the evidence has not changed.

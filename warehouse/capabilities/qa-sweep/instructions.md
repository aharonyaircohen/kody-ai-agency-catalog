# Instructions

Use the `qa-sweep` skill.

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

# QA Sweep

## Job

Run broad exploratory QA against the live app and summarize actionable findings.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

A QA report and, when needed, an inbox recommendation.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Do not edit code.
- Do not merge or approve PRs.
- Run one QA sweep at a time.
- Require a working browser/auth setup before enabling.

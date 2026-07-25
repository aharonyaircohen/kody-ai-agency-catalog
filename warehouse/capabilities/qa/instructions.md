# Instructions

Use the `qa` skill.

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

# QA Changelog Verification

## Job

Verify shipped but unverified changelog entries against the live app.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

A changelog QA marker update and inbox recommendation when a result needs attention.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- One QA run in flight at a time.
- Only edit QA markers on changelog bullets.
- Do not rewrite release notes.
- Do not create fix goals without operator approval.

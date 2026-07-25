# Instructions

Use the `health-check` skill.

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

# Kody Health Check

## Job

Report Kody-assigned tasks that have not been updated within the expected window.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

Refresh `.kody/reports/health-check.md`.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Read-only on scanned issues.
- Do not re-kick or relabel tasks.
- Never create or comment on issues from this capability.
- Only write the health-check report.

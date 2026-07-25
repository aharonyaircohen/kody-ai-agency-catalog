# Instructions

Use the `work-briefing` skill.

Create the briefing only. Do not create, assign, edit, close, or solve work.

# Final message format (required)

Your final message must use this exact shape:

```
DONE
PR_SUMMARY:
<the briefing>
```

If you cannot complete the run, output one line instead:

```
FAILED: <reason>
```


---

# Work Briefing

## Job

Summarize what needs attention across reports, tasks, reviews, running work, waiting items, and recent failures.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

A short, prioritized briefing for the user.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Do not create, assign, close, or edit work.
- Do not solve report findings.
- Do not install skills.
- Keep the result focused on decisions and next actions.

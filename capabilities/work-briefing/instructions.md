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

## Implementation

Run the `work-briefing` implementation. Its skill owns the detailed method.

## Output

A short, prioritized briefing for the user.

## Allowed Commands

- Run the `work-briefing` implementation.

## Restrictions

- Do not create, assign, close, or edit work.
- Do not solve report findings.
- Do not install skills.
- Keep the result focused on decisions and next actions.

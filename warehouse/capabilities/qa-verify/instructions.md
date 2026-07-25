# Instructions

Use the `qa-verify` skill.

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

# QA Fix Verification

## Job

Re-check delivery PRs against their previews before merge and route pass/fail outcomes to the inbox.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

A UI-review dispatch, merge recommendation, fix recommendation, or trusted merge action.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- One review in flight at a time.
- Do not edit code.
- Only merge automatically after trust graduation.
- Use the UI-review verdict, not labels alone, for pass/fail decisions.

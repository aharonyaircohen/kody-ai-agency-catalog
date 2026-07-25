# Instructions

Use the `approval-gate` skill.

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

# Approval Gate

## Job

Review QA goal PRs. Verify each candidate, reject duplicates or failed fixes, and recommend or dispatch merge only when the trust ledger allows it.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

Inbox recommendation, QA verification dispatch, or trusted merge dispatch on the target PR.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- QA goal PRs only.
- One PR action per tick.
- Never edit files, push branches, open PRs, or merge outside the trusted merge path.
- Trust-ledger uncertainty means ask, do not auto-act.

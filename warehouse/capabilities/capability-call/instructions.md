# Instructions

Use the `capability-call` skill.

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

# Capability Call

## Job

Propose one high-ROI missing capability that the system does not already have.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

A proposal issue for operator approval.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- One proposal per tick.
- Do not create the capability directly.
- Never re-propose rejected ideas.
- Respect dismissed ideas until their cooling-off window expires.

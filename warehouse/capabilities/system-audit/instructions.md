# Instructions

Use the `system-audit` skill.

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

# System Audit

## Job

Audit `.kody/` coordination for broken references, missed ticks, missing state, stuck dispatches, and duplicate dispatches.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

A consolidated comment on the Kody system audit tracking issue when findings exist.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Read-only except for the system-audit tracking issue.
- One comment per tick.
- Do not fix, relabel, or re-kick anything.
- Stay quiet when there are no findings.

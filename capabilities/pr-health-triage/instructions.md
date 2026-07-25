# Instructions

Use the `pr-health-triage` skill.

{{capabilityReference}}

## Prior state

```json
{{jobStateJson}}
```

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

# PR Health Triage

## Job

Review open PRs for conflicts, failed CI, or stale branches, then recommend the next safe repair.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

A PR repair recommendation.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Only `fix-ci`, `sync`, or `resolve` repairs are in scope.
- One repair comment per PR per tick.
- Never merge, close, approve, relabel, edit files, or dispatch a repair.
- This capability is advisory-only; operator confirmation triggers the repair.

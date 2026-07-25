# Instructions

Use the `capability-review` skill.

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

# Capability Review

## Job

Review one capability at a time for design soundness, reachable steps, cadence, and observed output.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

A finding comment or cycle summary on the capability-review tracking issue.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Do not execute or fix the reviewed capability.
- Do not review yourself.
- One capability and one comment at most per tick.
- Read-only except for the tracking issue.

# Instructions

Use the `design-review` skill.

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

# Design Review

## Job

Run a periodic design-health sweep for visual coherence, usability, and accessibility risks.

## Implementation

Run the `design-review` implementation. Its skill owns the detailed method and runtime state handling.

## Output

A tracking issue or nudge for the design sweep.

## Allowed Commands

- Run the `design-review` implementation.

## Restrictions

- Do not edit UI directly.
- Do not open PRs from the capability.
- At most one tracking issue or comment per tick.
- Report concrete user-visible issues only.

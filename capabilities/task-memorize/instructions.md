# Instructions

Use the `task-memorize` skill.

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

# Task Memorize

## Job

Turn task and execution experience into durable `.kody/memory/` entries.

## Implementation

Run the `task-memorize` implementation. Its skill owns the detailed method and runtime state handling.

## Output

New or updated memory files and index entries when high-confidence lessons exist.

## Allowed Commands

- Run the `task-memorize` implementation.

## Restrictions

- Never edit the source task recommendation file.
- Do not promote weak or speculative lessons.
- Use memorization markers to avoid duplicates.
- Do not overwrite reserved memory filenames.

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

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

New or updated memory files and index entries when high-confidence lessons exist.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Never edit the source task recommendation file.
- Do not promote weak or speculative lessons.
- Use memorization markers to avoid duplicates.
- Do not overwrite reserved memory filenames.

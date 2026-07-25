# Task Memory Extractor

## Job

Every tick, follow these instructions:

```bash
bash .kody/capabilities/task-memory-extractor/tick.sh
```

These instructions and the capability-owned tools define scanning `.kody/tasks/*/memory-recs.json`, writing high-confidence memory files, updating `INDEX.md`, marking tasks extracted, and committing any promoted memory.

## Restrictions

- Never edit `.kody/tasks/*/memory-recs.json`.
- Promote only high-confidence recommendations.
- Keep `.extracted` markers as the dedupe record.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `capability` (string, needed): Runtime capability slug whose sidecar state is loaded and updated.

# Auto Resolve

## Job

Every tick, follow these instructions:

```bash
bash .kody/capabilities/auto-resolve/tick.sh
```

These instructions and the capability-owned tools define PR selection, attempt limits, stuck labels, comments, and next-state output.

## Restrictions

- Act only on open, non-draft PRs whose mergeable state is `CONFLICTING`.
- Do not issue more than two `@kody resolve` comments per head SHA.
- After two failed attempts on a head SHA, mark `kody:stuck-conflict`.
- Keep state in `.kody/capabilities/auto-resolve.state.json`.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `capability` (string, needed): Runtime capability slug whose sidecar state is loaded and updated.

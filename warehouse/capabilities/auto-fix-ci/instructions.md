# Auto Fix CI

## Job

Every tick, follow these instructions:

```bash
bash .kody/capabilities/auto-fix-ci/tick.sh
```

These instructions and the capability-owned tools define PR selection, attempt limits, stuck labels, comments, and next-state output.

## Restrictions

- Act only on open, non-draft PRs whose settled CI has at least one failing or timed-out check.
- Skip pending CI.
- Do not issue more than two `@kody fix-ci` comments per head SHA.
- After two failed attempts on a head SHA, mark `kody:stuck-ci`.
- Keep state in `.kody/capabilities/auto-fix-ci.state.json`.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `capability` (string, needed): Runtime capability slug whose sidecar state is loaded and updated.

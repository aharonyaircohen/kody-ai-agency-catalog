# Job Gap Scan

## Job

Once per day, follow these instructions:

```bash
bash .kody/capabilities/job-gap-scan/tick.sh
```

The implementation writes one advisory proposal report to `.kody/reports/job-gap-scan.md` and updates `.kody/capabilities/job-gap-scan.state.json`.

## Restrictions

- Advisory only.
- Never write a new capability directly.
- Never re-surface a permanently rejected candidate.
- Respect the dismiss cool-off in implementation logic.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `capability` (string, needed): Runtime capability slug whose sidecar state is loaded and updated.

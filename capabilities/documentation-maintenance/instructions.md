# Instructions

Use the `documentation-maintenance` skill.

Run only the work requested by the matching capability. Follow the capability profile metadata for agent, mentions, and safety limits. The owning goal or loop decides when this runs.

# Final message format (required)

Your final message must use this exact shape:

```text
DONE
PR_SUMMARY:
- <short summary of what happened>
```

If you cannot complete the run, output one line instead:

```text
FAILED: <reason>
```


---

# Documentation Maintenance - keep the repo well documented

## Job

Run a weekly documentation-maintenance sweep that reverse-engineers the current repo from code, tests, routes, config, and existing docs, then identifies the most valuable documentation work.

## Implementation

Run `documentation-maintenance` implementation.

## Output

A concise docs health report, one tracking issue or issue comment, and one inbox recommendation for the highest-value documentation gap.

## Allowed Commands

- Run `documentation-maintenance` implementation.

## Restrictions

- Do not hard-code product-specific pages, features, or workflows in the capability.
- Community standards are the only fixed checklist.
- Discover product behavior from repo evidence before documenting it.
- Advisory only: do not edit docs, commit, push, merge, or approve from this capability.
- Prefer one focused recommendation per run over a broad rewrite.

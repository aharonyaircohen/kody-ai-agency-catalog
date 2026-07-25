Produce a deep, detailed implementation plan for the GitHub issue below. Do not write code, run git/gh, or modify files.

Use the `implementation-planning` skill.

# Repo

- {{repoOwner}}/{{repoName}}, default branch: {{defaultBranch}}

# Issue #{{issue.number}}: {{issue.title}}

{{issue.body}}

Recent comments (most recent first, truncated):
{{issue.commentsFormatted}}

{{conventionsBlock}}

{{priorArt}}

# Run

- Follow the `implementation-planning` skill, including delta mode when a prior plan exists.
- Fetch issue URLs with Playwright MCP before planning.
- Use `plan-scout` subagents in parallel when distinct investigation areas exist.
- Meet the research floor before writing the plan.
- Cite only files and APIs actually read.
- Read only. Do not modify files or run git/gh.

# Final message format (required)

Your FINAL message must start with this exact marker block, with nothing before it:

```
DONE
COMMIT_MSG: plan: <very short title>
PR_SUMMARY:
<the deep implementation plan using the structure defined in the implementation-planning skill>
```

If you cannot produce the plan, output a single line instead: `FAILED: <reason>`.


---

# Issue Planning

## Job

Research an issue and produce an implementation plan without editing code.

## Execution

Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Output

A clear plan attached to the issue or returned by the engine.

## Allowed Commands

- Follow these instructions and use the capability-owned files in `skills/` and `tools/` when needed.

## Restrictions

- Do not edit files.
- Do not open a pull request.
- Stop after the plan unless another capability is explicitly dispatched.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `issue` (integer, needed): GitHub issue number to work on.

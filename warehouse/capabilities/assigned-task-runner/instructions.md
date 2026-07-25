# Assigned Task Runner

Run only the work requested by the matching capability.

## Run

1. List open issues assigned to the Kody assignee login, default `kody`:

   ```sh
   gh issue list --state open --assignee kody --json number,title,labels,assignees,updatedAt --limit 100
   ```

2. Filter out:
   - pull requests
   - any issue with `status:needs-human` or `status:blocked`
   - any issue with an active `kody:*` lifecycle label
   - any issue with an open PR already linked to it

   To check linked PRs, use `gh issue view <N> --json timelineItems` or another read-only `gh` query that proves whether a PR already exists.

3. Pick the oldest eligible issue, priority labels first if present: `priority:P0`, `priority:P1`, `priority:P2`, `priority:P3`, then no priority.

4. Start work with the engine tool:

   ```text
   start_capability({ name: "run", issue: <number> })
   ```

5. Call `submit_state` exactly once before the final response:

   ```json
   {
     "cursor": "idle",
     "data": {
       "lastRunISO": "<now ISO>",
       "lastSelectedIssue": <number or null>,
       "lastOutcome": "<dispatched | idle | blocked>"
     },
     "done": false
   }
   ```

   If the submit tool is unavailable, emit the same JSON in a fenced block tagged `kody-job-next-state`.

## Boundaries

- Process ONE issue per tick.
- Do not post `@kody` comments.
- Do not dispatch if the issue needs human review, is already running, or already has a PR.
- Do not edit source files or push branches.

<!-- kody:output-format (managed — edit above this line only) -->

# Final message format (required)
Your FINAL message MUST be exactly this block, with nothing before it:

DONE
PR_SUMMARY:
- <short summary of what happened>

If you cannot complete the run, output a single line instead: FAILED: <reason>


---

# Assigned Task Runner

## Job

Start one open task that is already assigned to Kody and not already running.

This capability is the second half of task delivery:

- `task-verifier` decides whether an unassigned backlog item is safe for Kody.
- `assigned-task-runner` starts safe tasks that are assigned to Kody.

## Selection

Pick at most one issue per tick.

Eligible issue:

- open issue, not a pull request
- assigned to the Kody assignee login
- not labeled `status:needs-human`
- not labeled `status:blocked`
- not labeled `kody:queued`, `kody:running`, `kody:fixing`, `kody:resolving`, `kody:reviewing`, `kody:syncing`, `kody:needs-fix`, `kody:done`, or `kody:failed`
- no open PR already linked to the issue

Default Kody assignee login is `kody`. A consumer repo may override that in its local copy of this capability.

## Action

Use `start_capability({ name: "run", issue: <number> })` to start the selected task.

Do not post a bot-authored `@kody` comment. Bot-authored command comments are rejected by the engine.

## Restrictions

- Process ONE issue per tick. Do not batch.
- Never start work on an issue marked `status:needs-human`.
- Never start work on an issue already carrying an active `kody:*` lifecycle label.
- Never start work on an issue that already has an open PR.
- Do not edit source files or push branches.
- Only use `gh` to inspect issues and PRs; use `start_capability` to dispatch.

## State

Evergreen capability. Keep `cursor` as `"idle"`, carry forward useful `data`, and keep `done` as `false`.

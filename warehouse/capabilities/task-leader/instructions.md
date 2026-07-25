# Task Leader

Use `task-leader-rules` skill. It owns the 6-step method, small-change rules, and tripwire path list.

## Run

1. Read capability profile at `.kody/capabilities/task-leader/profile.json` to load operator-tunable knobs (`readyPreviewCap`, `smallChangeMaxLines`, `smallChangeMaxFiles`, `staleReviewHours`, `blockAutoMergeLabel`, `releaseAutoMergeTitlePrefix`, `releaseAutoMergeBranchPrefix`, `releasePromotionTitlePrefix`, `releaseAutoMergeAllowedPaths`, `dispatchComment`, `tripwirePaths`).
2. Follow the skill's 6 steps in order. If a step has nothing to do, log "0 actions" and move on.
3. Before the final response, call `submit_state` exactly once with `cursor: "idle"`, carried-forward useful `data`, and `done: false`.
4. End with the final message format below.

## Boundaries

- You are a deterministic orchestrator. Do not improvise or invent new steps.
- Do not edit any file in the repo (read-only on capability profile is allowed).
- Do not push branches.
- The 6 steps run in order. Do not skip a step.
- One tick = one pass = one rate-limit window.

<!-- kody:output-format (managed - edit above line only) -->

Final message format (required)
FINAL message MUST exactly be:

DONE
PR_SUMMARY:
- step1: queue count = <N>
- step2: reviews requested = <N>
- step3: fixes requested = <N>
- step4: approvals = <N> (list PR numbers)
- step4: merges = <N> (list PR numbers)
- step5: dispatches = <N> (list issue numbers)
- step6: escalations = <N> (list PR numbers)

If you cannot answer, output single line instead:
FAILED: <reason>


---

# Task Leader

## Capability

Every 15 minutes, coordinate the work pipeline:

- request missing reviews (code + UI)
- request fixes for PR concerns
- auto-merge safe PRs, including release lanes
- leave backlog dispatch to `assigned-task-runner`
- escalate stale PRs to the operator

Read and follow `.kody/capabilities/task-leader/skills/task-leader-rules/SKILL.md` exactly.
That rules file owns the 6-step method, normal small-PR gate, release version PR gate, release promotion PR gate, and final output format.

## Allowed Commands

- `gh issue list`
- `gh issue view`
- `gh issue comment`
- `gh pr list`
- `gh pr view`
- `gh pr checks`
- `gh pr comment`
- `gh pr review`
- `gh pr merge`
- `gh release view`

## Restrictions

- Stay within the capability's purpose and `task-leader-rules`.
- Do not perform actions outside the contract defined by this capability.
- Do not bypass the auto-merge gates defined by `task-leader-rules`: normal PRs require both reviews and small-change checks; release lanes must satisfy their dedicated release gates.
- One tick = one pass = one rate-limit window. Do not loop.
- Do not edit source files or push branches.

## State

Evergreen capability. Keep `cursor` as `"idle"`, carry forward any useful `data`, and keep `done` as `false`.

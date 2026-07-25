Browse the running app like a real user and produce one structured QA report. Do not fix bugs, touch tracked source files, or run git/gh.

Use the `qa-session` skill.

Do not write report files or throwaway artifacts; screenshots captured through
Playwright MCP are enough for evidence references.

# Target

Base URL: `{{previewUrl}}` (resolved from: {{previewUrlSource}})
{{#args.scope}}Focus: **{{args.scope}}**{{/args.scope}}
{{^args.scope}}Focus: broad smoke across discovered routes.{{/args.scope}}
{{qaAuthBlock}}

Report destination: {{#args.goal}}existing kody goal `{{args.goal}}`{{/args.goal}}{{^args.goal}}{{#args.issue}}existing issue #{{args.issue}}{{/args.issue}}{{^args.issue}}a new kody goal{{/args.issue}}{{/args.goal}}.

# QA context

```text
{{qaContext}}
```

# QA scenarios and notes

{{qaProfile}}

{{conventionsBlock}}

{{toolsUsage}}

# Run

- Follow the `qa-session` skill.
- Navigate to `{{previewUrl}}` before any other browsing.
- Use Playwright MCP for ad-hoc browsing and screenshots.
- Never write credentials in reports, findings, evidence captions, or posted text.
- Do not edit tracked source files or run git/gh.

# Final response (required)

Return exactly the raw QA report markdown defined in the `qa-session` skill,
including the machine-readable findings JSON block. Do not wrap it in `DONE`,
`COMMIT_MSG`, or `PR_SUMMARY`.


---

# qa-engineer

Free-form QA: browses a running site with Playwright MCP, explores routes, exercises UI states, posts a structured QA report. Opens a new issue per run by default; pass --issue <N> to comment on an existing one. Read-only on the repo.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `url` (string): Base URL the agent should browse. Optional — resolveQaUrl preflight falls back to the goal-branch Vercel deployment (when --goal is set), then $PREVIEW_URL, then the `QA_URL` variable in .kody/variables.json. Errors if none resolve.
- `scope` (string): Optional feature focus (e.g. 'admin chat memory recall'). Without a scope the agent does a broad smoke pass over discovered routes.
- `goal` (string): Optional kody goal id to attach findings to. When set: (1) resolveQaUrl looks up the goal-branch's latest Vercel deployment and uses its URL, (2) createQaGoal skips manifest creation and labels finding issues `goal:<id>` directly.
- `issue` (integer): Optional: comment the QA report on this existing issue instead of opening a new one.
- `authProfile` (string): Path to a Playwright storageState.json for pre-authenticated sessions (skips manual login).

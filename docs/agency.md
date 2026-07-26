# Agency assets

The Store contains reusable Agents, Capabilities, and Workflows. Runtime
Todos, Loops, and Runs belong to each consumer's Convex state.

Every Capability is one folder:

```text
capabilities/<name>/
├── instructions.md
├── contract.json
├── skills/
└── tools/
```

The optional contract declares `execution: "agent" | "script"`, exactly one
input, and exactly one output. Script-backed Capabilities provide
`tools/run.sh`. It is required when a Workflow branches on output fields. Agent selection,
conditions, approval, and step order belong to Workflow. Schedules belong to
Loop. A direct Capability run uses Kody.

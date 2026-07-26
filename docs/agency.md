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

The optional contract contains exactly one input and one output. It is required
when a Workflow branches on output fields. Agent selection,
conditions, approval, and step order belong to Workflow. Schedules belong to
Loop. A direct Capability run uses Kody.

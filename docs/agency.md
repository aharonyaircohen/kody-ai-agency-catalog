# Agency assets

The Store contains reusable Agents, Capabilities, Workflows, Loop definitions,
and Solutions. Runtime Todos, Loop instances, Runs, approvals, and secrets
belong to each consumer and are not stored here.

Every Capability is one folder:

```text
catalog/capabilities/<name>/
├── instructions.md
├── contract.json
├── skills/
└── tools/
```

`instructions.md` is required. The optional contract declares
`execution: "agent" | "script"` plus the Capability's input and output schemas.
Script-backed Capabilities provide `tools/run.sh`. A contract is required when
a Workflow branches on fields returned by the Capability.

Ownership stays simple:

- An Agent defines identity and judgment.
- A Capability owns one action contract.
- A Workflow owns Agent selection, step order, conditions, approvals, and
  iteration bounds.
- A Loop owns one reusable trigger and starts one Workflow or Capability.
- A Solution names one or more Workflow or Loop entry points; its dependency
  tree is derived from the catalog.

Installing a Store asset activates a reference for the selected consumer. It
does not move consumer runtime state into this repository.

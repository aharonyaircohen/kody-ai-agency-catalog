# Assets

The reusable Agency catalog has five asset roots:

- `agents/<slug>.md`
- `catalog/capabilities/<slug>/`
- `catalog/workflows/<slug>/workflow.json`
- `catalog/loops/<slug>/loop.json`
- `catalog/solutions/<slug>/solution.json`

A Capability folder contains `instructions.md`, `contract.json`, `skills/`,
and `tools/`; only `instructions.md` is always required. A Workflow owns
orchestration, conditions, approval behavior, and one Agent. A Loop owns one
trigger and starts one Workflow or Capability.

A Solution is the installable product layer. It declares one or more Workflow
or Loop entry points. It does not repeat Agents, Capabilities, categories, or
dependencies because those are resolved through `Loop -> Workflow -> Agent +
Capabilities`.

`commands/` and `cms/` are separate platform catalogs. `warehouse/` preserves
legacy Agency assets and is not installable.

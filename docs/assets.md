# Assets

The shared Agency catalog has four asset roots:

- `agents/<slug>.md`
- `capabilities/<slug>/`
- `workflows/<slug>/workflow.json`
- `loops/<slug>/loop.json`

A Capability folder contains `instructions.md`, `contract.json`, `skills/`,
and `tools/`. A Workflow owns orchestration, conditions, approval behavior,
and one Agent. Direct Capability runs use Kody.
A Loop owns one trigger and starts one Workflow or Capability.

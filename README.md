# Kody Store

The Store has one active catalog and one legacy warehouse.

- `catalog/capabilities/` contains active simple executable folders.
- `catalog/workflows/` contains active visual orchestration definitions, conditions,
  approval behavior, and one Agent selection.
- `catalog/pipelines/` contains ordered reusable Workflow sequences.
- `catalog/loops/` contains active trigger definitions that start one Workflow or
  Capability.
- `catalog/solutions/` contains complete Store setups. Each Solution names one or
  more Loop or Workflow entry points; its dependency tree is derived.
- `warehouse/` preserves older Agency items but is not installable.
- `agents/` contains Agent identities.
- `commands/` and `cms/` remain separate platform catalogs.

Capability folders contain only:

```text
instructions.md
contract.json
skills/
tools/
```

`contract.json` is required when a Workflow reads fields from the Capability's
result. It also declares `execution: "agent" | "script"`; script-backed
Capabilities provide `tools/run.sh`. Capabilities receive one JSON input and
return one JSON output. Loop definitions may be shared here; runtime Loop state,
Runs, and repository state are not.

A Solution folder contains only `solution.json`:

```json
{
  "schemaVersion": 1,
  "id": "web-release",
  "name": "Web Release",
  "description": "Validate, merge, and deploy web releases",
  "entrypoints": [{ "kind": "loop", "id": "daily-web-release-loop" }]
}
```

Solutions do not duplicate categories or dependencies. Store consumers resolve
`Loop -> Pipeline -> Workflow -> Agent + Capabilities` or the shorter direct
paths when no Pipeline is needed.

Run `npm test` and `npm run validate:store` after editing the catalog.

Documentation:

- [Agency ownership](docs/agency.md)
- [Catalog asset shapes](docs/assets.md)
- [Solutions and installation](docs/solutions.md)
- [GitHub Issue Maintenance](docs/github-issue-maintenance.md)
- [Resolution order](docs/resolution.md)
- [Maintenance](docs/maintenance.md)

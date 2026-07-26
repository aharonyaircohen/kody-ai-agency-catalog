# Kody Store

The Store has one active catalog and one legacy warehouse.

- `catalog/capabilities/` contains active simple executable folders.
- `catalog/workflows/` contains active visual orchestration definitions, conditions,
  approval behavior, and one Agent selection.
- `catalog/loops/` contains active trigger definitions that start one Workflow or
  Capability.
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
return one JSON output. Loop definitions
may be shared here; runtime Loop state, Runs, and repository state are not.

Run `npm test` and `npm run validate:store` after editing the catalog.
See [docs/agency.md](docs/agency.md) for the ownership boundary.

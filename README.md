# Kody Store

Shared, reusable Kody assets.

- `agents/` contains Agent identities.
- `capabilities/` contains simple executable folders.
- `workflows/` contains visual orchestration definitions, conditions,
  approval behavior, and one Agent selection.
- `loops/` contains reusable trigger definitions that start one Workflow or
  Capability.
- `commands/` and `cms/` remain separate platform catalogs.

Capability folders contain only:

```text
instructions.md
contract.json
skills/
tools/
```

`contract.json` declares exactly one input and one output. Loop definitions may
be shared here; runtime Loop state, Todos, Runs, and repository state are not.

Run `npm test` and `npm run validate:store` after editing the catalog.
See [docs/agency.md](docs/agency.md) for the ownership boundary.

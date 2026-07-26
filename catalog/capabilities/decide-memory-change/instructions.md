# Decide Memory Change

Turn reviewed repository-memory candidates into conservative change decisions.

Return strict JSON decisions using only:

- `create` for a new durable lesson.
- `update` for a clearly outdated or conflicting memory, including its target
  memory identifier.
- `skip` for duplicates, noise, weak evidence, uncertainty, or no useful
  change.

Every create or update must include evidence
`{ "source": "engine-run", "id": "<runId>" }`, confidence, and a reason.
Updates must preserve revision history.

Never delete memory. Never access personal memory.
Do not invoke write tools; this capability only decides.

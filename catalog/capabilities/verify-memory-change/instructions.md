# Verify Memory Change

Verify that each accepted repository-memory decision was persisted exactly
once, has engine-run evidence pointing to the source run, and, for updates,
created a new revision without losing history.
Use each applied item's `runId` for its evidence check.

For each applied memory, invoke `get` and `history`:

`node "<kody-memory.mjs path from Tools>" '{"resource":"memory","action":"get","memoryId":"<memoryId>"}'`

`node "<kody-memory.mjs path from Tools>" '{"resource":"memory","action":"history","memoryId":"<memoryId>"}'`

After all checks pass, mark every source run complete:

`node "<kody-memory.mjs path from Tools>" '{"resource":"learning","action":"complete","sourceRunId":"<runId>"}'`

If any check fails, mark every source run failed with a short reason:

`node "<kody-memory.mjs path from Tools>" '{"resource":"learning","action":"fail","sourceRunId":"<runId>","failure":"<reason>"}'`

An empty `sourceRunIds` input is valid and requires no ledger call.
Return JSON with `verified`, the checked memory identifiers, and any failures.
Do not create, update, or delete memory; only update the learning claim ledger.
Never access personal memory.

# Apply Memory Changes

Apply only accepted `create` and `update` decisions through the typed repository
memory tool.

For every accepted decision:

- Use `remember` for `create`:
  `node "<kody-memory.mjs path from Tools>" '{"resource":"memory","action":"remember","kind":"<kind>","title":"<title>","summary":"<summary>","body":"<body>","runId":"<runId>","reason":"<reason>"}'`
- Use `update` for `update`:
  `node "<kody-memory.mjs path from Tools>" '{"resource":"memory","action":"update","memoryId":"<memoryId>","kind":"<kind>","title":"<title>","summary":"<summary>","body":"<body>","runId":"<runId>","reason":"<reason>"}'`
- Include the source Engine run as evidence.
- Preserve the decision's `runId` and return the persisted memory identifier
  and action.

Do not reinterpret decisions. Never access personal memory. Never delete
memory. If one write fails, report that failure explicitly and continue only
with independent decisions.

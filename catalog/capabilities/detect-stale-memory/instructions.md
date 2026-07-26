# Detect Stale Memory

Review repository memory against newer completed-run evidence.

Invoke both read-only commands:

`node "<kody-memory.mjs path from Tools>" '{"resource":"memory","action":"list"}'`

`node "<kody-memory.mjs path from Tools>" '{"resource":"learning","action":"recent-evidence","limit":20}'`

Return only memories whose current content is clearly outdated, together with
the newer source run, proposed replacement content, reason, and confidence.
Skip uncertain cases.

Return only the JSON object required by the capability contract. When nothing
is stale, return exactly `{"sourceRunIds":[],"candidates":[]}`. Do not add
explanations, checked-memory fields, or alternate result keys.

Do not delete or modify memory. Never access personal memory.

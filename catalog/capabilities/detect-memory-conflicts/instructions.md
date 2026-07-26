# Detect Memory Conflicts

Compare proposed lessons with existing repository memory and identify claims
that cannot both be true.

Use repository search when the prior duplicate result does not contain enough
context:

`node "<kody-memory.mjs path from Tools>" '{"resource":"memory","action":"search","query":"<claim>","limit":10}'`

For every conflict, return the candidate identifier, existing memory
identifier, the conflicting claims, and which side has stronger evidence.
Prefer newer direct run evidence over older inference, but mark the result
uncertain when the evidence is not decisive.

Do not modify memory. Never access personal memory.
Preserve `sourceRunIds`, `candidates`, and `duplicates` unchanged in the output.

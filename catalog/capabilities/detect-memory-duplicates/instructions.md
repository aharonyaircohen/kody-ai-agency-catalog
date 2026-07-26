# Detect Memory Duplicates

Compare proposed repository-memory candidates with existing repository memory.

For each candidate, invoke the repository search command:

`node "<kody-memory.mjs path from Tools>" '{"resource":"memory","action":"search","query":"<candidate meaning>","limit":10}'`

Return JSON that maps each candidate to either no match or the best matching
memory identifier, with a short reason and confidence. Treat paraphrases with
the same durable meaning as duplicates.

Do not modify memory. Never access personal memory.
Preserve `sourceRunIds` and `candidates` unchanged in the output.

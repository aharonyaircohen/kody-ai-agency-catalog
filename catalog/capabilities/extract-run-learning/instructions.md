# Extract Run Learning

Claim at most one completed run by invoking:

`node "<kody-memory.mjs path from Tools>" '{"resource":"learning","action":"claim"}'`

If the result is `null`, return empty `sourceRunIds` and `candidates` arrays.
Otherwise, review only the returned run and identify durable lessons that would
help future work in the same repository.

Use repository memory only. Never personal memory.

Return JSON with:

- `sourceRunIds`: exactly the claimed run identifier, or an empty array.
- `candidates`: zero or more items containing `candidateId`, `kind`, `title`,
  `summary`, `body`, `confidence`, and evidence `{ "source": "engine-run",
  "id": "<runId>" }`.

Keep facts, feedback, project conventions, and useful references only when the
run provides clear evidence. Ignore logs, transient failures, guesses,
credentials, personal details, and information that only describes the run.
An empty candidate list is a valid result.

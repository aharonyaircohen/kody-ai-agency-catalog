Design the smallest complete document set and navigation for the supplied
documentation request. Work read-only.

Invoke `documentation-writer` as an information-architecture specialist. Use
the established audience, scope, evidence, and unknowns from the current
workflow run. Choose document boundaries by reader task rather than repository
folder layout. Include prerequisites, conceptual orientation, task guides,
reference, and troubleshooting only where the evidence and request require
them. Honor the requested `documentType` and `destination`. Return `blocked` if
the upstream brief or evidence is unavailable; otherwise return `pass`.

Return exactly one JSON object matching the capability contract. Include
`version: 1` and a concise `summary`.

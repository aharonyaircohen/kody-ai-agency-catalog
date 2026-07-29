Design the smallest complete document set and navigation for the supplied
documentation request. Work read-only.

Invoke `documentation-writer` as an information-architecture specialist. Use
the established audience, scope, evidence, and unknowns from the current
workflow run. Choose document boundaries by reader task rather than repository
folder layout. Include prerequisites, conceptual orientation, task guides,
reference, and troubleshooting only where the evidence and request require
them. Return `blocked` if the upstream brief or evidence is unavailable.

Return exactly one JSON object matching the capability contract.

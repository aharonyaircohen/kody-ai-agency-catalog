Design the smallest complete document set and navigation for the supplied
documentation request. Work read-only.

Invoke `documentation-writer` as an information-architecture specialist. Use
the established audience, scope, evidence, and unknowns from the current
workflow run. Choose document boundaries by reader task rather than repository
folder layout. Include prerequisites, conceptual orientation, task guides,
reference, and troubleshooting only where the evidence and request require
them. Honor the requested `documentType` and `destination`. Return `blocked` if
the upstream brief or evidence is unavailable; otherwise return `pass`.

When `documentType` requests an AI operating guide, design a single compact
reference for an AI agent that will directly operate the documented system.
Organize it around purpose and scope, authoritative source priority, required
inputs, available actions, decision rules, ordered procedures, expected
outputs, safety limits, and failure handling. Include verified operational
examples when evidence supports them. Exclude human onboarding and explanatory
narrative that does not change an AI decision or action.
Use one operating procedure and one compact input/output contract section.
State each fact once. Do not repeat either section in an appendix, create a
second routing table, or reproduce internal capability contracts when the
external AI only needs the workflow-level contract.
Require one verified invocation mechanism that the target AI can actually use.
Return `blocked` when no verified invocation mechanism is available; do not
design a guide that tells the AI to run the system without showing how.

Return exactly one JSON object matching the capability contract. Include
`version: 1` and a concise `summary`.

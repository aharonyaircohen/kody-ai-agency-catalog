Independently verify every material factual claim in the current documentation
draft against the evidence ledger and repository sources. Work read-only.
Treat `input.document` as the only draft under review. Do not discover, select,
or substitute another repository document.

Invoke `documentation-reviewer`. Check names, paths, defaults, prerequisites,
permissions, limits, version-sensitive statements, and failure behavior.
Return `changed` for unsupported, contradicted, or misleading claims. Return
`blocked` when required sources cannot be accessed. A polished draft is not a
pass unless its claims are traceable.

Return exactly one JSON object matching the capability contract. Include
`version: 1`, a concise `summary`, and only inspected evidence in
`source_evidence`.

Independently verify every material factual claim in the current documentation
draft against the evidence ledger and repository sources. Work read-only.
`input.document` is the canonical draft and the only draft under review. Do not
read or write the destination file; it may be absent or stale. Do not discover,
select, or substitute another repository document.

Invoke `documentation-reviewer`. Check names, paths, defaults, prerequisites,
permissions, limits, version-sensitive statements, and failure behavior.
Return `changed` for unsupported, contradicted, or misleading claims. Return
`blocked` when required sources cannot be accessed. A polished draft is not a
pass unless its claims are traceable.

Use stable evidence references. For hydrated or generated files, cite the path
and a stable identifier such as a JSON key, workflow step ID, or heading. Do
not require exact line-number ranges for hydrated or generated files. Treat
line-number-only drift as non-material unless it changes the documented fact.

Return exactly one JSON object matching the capability contract. Include
`version: 1`, a concise `summary`, and only inspected evidence in
`source_evidence`.

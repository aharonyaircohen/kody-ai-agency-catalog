Test the commands, code samples, API examples, and procedures in the current
documentation draft. Work read-only: do not modify tracked files or external
state.
Treat `input.document` as the only draft under test. Do not discover, select,
or substitute another repository document.

Invoke `documentation-reviewer`. Run only safe, local, non-destructive checks.
Never execute production, deployment, deletion, credential, billing, or
external-write examples. For unsafe or unavailable examples, perform static
verification and identify the limit instead of pretending it ran. Return
`changed` for any reproducible defect and identify the exact example. Return
`blocked` only when the draft cannot be responsibly evaluated.

Return exactly one JSON object matching the capability contract. Include
`version: 1`, a concise `summary`, and only inspected evidence in
`source_evidence`.

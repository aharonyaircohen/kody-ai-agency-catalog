Test the commands, code samples, API examples, and procedures in the current
documentation draft. Work read-only: do not modify tracked files or external
state.

Invoke `documentation-reviewer`. Run only safe, local, non-destructive checks.
Never execute production, deployment, deletion, credential, billing, or
external-write examples. For unsafe or unavailable examples, perform static
verification and report them as blocked rather than pretending they passed.
Return `fail` for any reproducible defect and identify the exact example.

Return exactly one JSON object matching the capability contract.

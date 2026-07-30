Review the current documentation set for reader success after example and
accuracy checks pass. Work read-only and invoke `documentation-reviewer`.
`input.document` is the canonical draft and the only draft under review. Do not
read or write the destination file; it may be absent or stale. Do not discover,
select, or substitute another repository document.

Check completeness against the brief, navigation, clarity, accessibility,
terminology, prerequisites, troubleshooting, link intent, and consistency.
Return `changed` for concrete reader-facing defects. Return `blocked` if the
draft or upstream verification results are unavailable. Do not repeat resolved
findings or invent style objections that do not affect reader success.

Use stable evidence references. For hydrated or generated files, cite the path
and a stable identifier such as a JSON key, workflow step ID, or heading. Do
not require exact line-number ranges for hydrated or generated files. Treat
line-number-only drift as non-material unless it harms reader success.

Return exactly one JSON object matching the capability contract. Include
`version: 1` and a concise `summary`.

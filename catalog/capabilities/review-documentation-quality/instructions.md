Review the current documentation set for reader success after the example and
accuracy checks complete. Work read-only and invoke `documentation-reviewer`.
Do not stop after announcing or planning a specialist invocation. You must
complete the review and return the contract result in the same run. If the
specialist is unavailable or is not actually invoked, perform the review
directly using the supplied draft, brief, and verification results.
Complete the quality review even when an earlier check returned `changed`.
`input.document` is the canonical draft and the only draft under review. Do not
read or write the destination file; it may be absent or stale. Do not discover,
select, or substitute another repository document.

Check completeness against the brief, navigation, clarity, accessibility,
terminology, prerequisites, troubleshooting, link intent, and consistency.
Read the example defects from `input.failures` and the accuracy findings from
`input.findings`. Combine all actionable example, accuracy, and quality findings
in the output `findings` array. Return `changed` when that combined array is not
empty and `pass` only when all three checks pass. Return `blocked` if the draft
or upstream verification results are unavailable. Do not repeat resolved
findings or invent style objections that do not affect reader success.

Use stable evidence references. For hydrated or generated files, cite the path
and a stable identifier such as a JSON key, workflow step ID, or heading. Do
not require exact line-number ranges for hydrated or generated files. Treat
line-number-only drift as non-material unless it harms reader success.

Return exactly one JSON object matching the capability contract. Include
`version: 1` and a concise `summary`.

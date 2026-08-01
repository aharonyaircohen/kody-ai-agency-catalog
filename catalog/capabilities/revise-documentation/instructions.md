Revise the current documentation draft only in response to verified example,
accuracy, or quality findings. Work read-only and invoke
`documentation-writer`.
`input.document` is the canonical draft and the only draft to revise. Do not
read or write the destination file; it may be absent or stale. Do not discover,
select, or substitute another repository document.

Preserve correct content and the approved scope. Resolve each actionable
finding from the combined `input.findings` array, update affected
cross-references, and retain explicit unknowns. Apply the combined findings in
one revision. Do not add unrelated sections or silently weaken a safety warning.
Provide the specialist with the complete, exact `input.document` and the
complete findings array; never replace either with a summary, excerpt, or
placeholder.
Return the complete revised Markdown document so the workflow can test it again.
Return `blocked` when the current draft or actionable findings are unavailable.
Return `changed` after producing the revised document.

Use stable evidence references. For hydrated or generated files, cite the path
and a stable identifier such as a JSON key, workflow step ID, or heading. Do
not require exact line-number ranges for hydrated or generated files. Do not
rewrite a correct statement solely to change its line-number citation.

Return exactly one JSON object matching the capability contract. Include
`version: 1`, a concise `summary`, and only inspected evidence in
`source_evidence`.

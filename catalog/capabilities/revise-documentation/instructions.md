Revise the current documentation draft only in response to verified example,
accuracy, or quality findings. Work read-only and invoke
`documentation-writer`.
Treat `input.document` as the only draft to revise. Do not discover, select, or
substitute another repository document.

Preserve correct content and the approved scope. Resolve each actionable
finding, update affected cross-references, and retain explicit unknowns. Do not
add unrelated sections or silently weaken a safety warning. Return the complete
revised Markdown document so the workflow can test it again. Return `blocked`
when the current draft or actionable findings are unavailable.

Return exactly one JSON object matching the capability contract.

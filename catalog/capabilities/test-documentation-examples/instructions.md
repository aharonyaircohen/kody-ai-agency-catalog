Test the commands, code samples, API examples, and procedures in the current
documentation draft. Work read-only: do not modify tracked files or external
state. Limit the review to commands, code samples, API examples, procedural
steps, and links required by those procedures. A defect is in scope only when
it makes an example or procedure unsafe, impossible, or misleading to follow.
`input.document` is the canonical draft and the only draft under test. Do not
read or write the destination file; it may be absent or stale. Do not discover,
select, or substitute another repository document.

Invoke `documentation-reviewer` with this same limited scope. Run only safe,
local, non-destructive checks. Never execute production, deployment, deletion,
credential, billing, or external-write examples. For unsafe or unavailable
examples, perform static verification and identify the limit instead of
pretending it ran.

For an AI operating guide, treat AI prompts, tool calls, structured inputs,
expected outputs, and decision procedures as executable examples. Verify their
shape, preconditions, status handling, and safe stopping behavior using the
same non-destructive rules.

Do not review general prose, source attribution, document-wide factual
accuracy, writing quality, or navigation outside a tested procedure. Leave
factual review to `verify-documentation-accuracy` and reader-facing quality
review to `review-documentation-quality`.

Report all reproducible example and procedure defects together in one result.
Complete the full scoped check before returning `changed`, identify each exact
example or procedure, and do not introduce findings from another review
category. Return `pass` when the scoped checks succeed. Return `blocked` only
when the draft cannot be responsibly evaluated.

Use stable evidence references. For hydrated or generated files, cite the path
and a stable identifier such as a JSON key, workflow step ID, or heading. Do
not require exact line-number ranges for hydrated or generated files. Treat
line-number-only drift as non-material unless it changes meaning or breaks a
reader action.

Return exactly one JSON object matching the capability contract. Include
`version: 1`, a concise `summary`, and only inspected evidence in
`source_evidence`.

Review the current documentation set for reader success after the example and
accuracy checks complete. Work read-only and invoke `documentation-reviewer`.
Provide the specialist with the complete, exact `input.document`; never replace
it with a summary, excerpt, or placeholder.
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
For an AI operating guide, require that the named AI audience can operate the
documented system without guessing. It must state the required context, inputs,
available actions, decision rules, ordered procedures, expected outputs, stop
conditions, safety limits, and failure recovery supported by the evidence. Mark
human-only explanation that adds no operational value as a quality defect.
Return `changed` when an AI operating guide has more than 120 lines without an
explicit brief requirement, repeats a procedure or contract, hardcodes values
from a test run as permanent rules, or tells the external AI to manually run
internal capabilities owned by the workflow engine.
Also return `changed` when the guide tells the AI to run the system but does
not provide a verified invocation mechanism that the named AI can execute.
Use this same checklist on every pass. Verify supplied findings and changed
passages before looking for regressions. Do not restart an open-ended audit or
introduce optional refinements. Add a new finding only when the revised
document is still materially incorrect, unsafe, or unusable.
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

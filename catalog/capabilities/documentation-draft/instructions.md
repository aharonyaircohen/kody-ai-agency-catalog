Create a publication-ready documentation draft for the supplied business brief
and GitHub issue. Work read-only: do not edit files, commit, push, or change
GitHub state.

Your returned `document` creates the workflow draft. For every later step,
`input.document` is the canonical draft. Do not read or write the destination
file; it may be absent or contain an older version and publication owns that
file.

Use the supplied brief, evidence, and document design from the cumulative
workflow context. Do not repeat research or review work owned by other
capabilities. Invoke `documentation-writer` once with those artifacts and
require a complete Markdown draft written for the intended audience.

The writer owns the prose. Preserve verified facts and explicit unknowns from
the supplied evidence, follow the supplied document design, and never invent
repository behavior. Return `blocked` when the brief, evidence, or design is
missing or cannot support a responsible draft. Return `pass` when the complete
draft is produced; later workflow capabilities own review and revision.

Match the document's depth to the requested document type and desired outcome.
For a practical usage guide, prefer roughly 150 to 250 lines unless the brief
or verified evidence clearly requires more. Include only the detail readers
need to complete the desired outcome. Exclude internal implementation detail
and unrelated workflows unless the brief explicitly asks for them.

For an AI operating guide, write for the AI agent as the direct operator. Make
every input, allowed action, decision condition, ordered step, expected result,
stop condition, safety rule, and recovery action explicit. Use stable names,
compact sections, normative language, and machine-readable examples where the
verified interface supports them. Keep each rule understandable without hidden
context. Do not add human onboarding, background narrative, persuasion, or
commentary. Do not claim an action is executable when the evidence only
describes it conceptually.

Use stable evidence references. For hydrated or generated files, cite the path
and a stable identifier such as a JSON key, workflow step ID, or heading. Do
not require exact line-number ranges for hydrated or generated files. A
line-number-only difference is not a material documentation defect.

Return exactly one JSON object with no Markdown fence or surrounding prose:

```json
{
  "version": 1,
  "status": "pass",
  "summary": "The writer produced the complete draft from the supplied artifacts.",
  "title": "Document title",
  "document": "# Complete Markdown document",
  "source_evidence": ["path/to/file: fact supported by this source"],
  "review_notes": []
}
```

Keep `source_evidence` concise and include only evidence supplied by the
upstream research capability.

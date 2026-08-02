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

Keep an AI operating guide as concise as possible while retaining every detail
needed for the named AI to operate safely and successfully. Do not use a hard
line, page, or word limit. State each fact once. Use one operating procedure,
one compact input/output contract, and no appendix that repeats either one.

Use placeholders for run-specific values such as `<issue-number>`,
`<repository>`, and `<destination>` unless the brief explicitly requests a
guide for one fixed run. Do not turn the evidence issue, approval comment,
branch, or publication destination into permanent operating rules.

The external AI submits the supported workflow input and interprets the
workflow result. The workflow engine owns capability sequencing, transitions,
and iteration limits. Do not instruct the external AI to invoke individual
internal capabilities or recreate the workflow's internal routing unless the
verified public interface explicitly requires it.

Include exactly one verified invocation example using the public entry point
supported by the supplied evidence. Show placeholders for its required values
and the expected workflow-level result. Return `blocked` when the evidence does
not establish an invocation mechanism; do not publish an instruction to run the
system without an executable command, endpoint, or tool call.

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

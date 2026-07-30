Create a publication-ready documentation draft for the supplied business brief
and GitHub issue. Work read-only: do not edit files, commit, push, or change
GitHub state.

Your returned `document` creates the workflow draft. For every later step,
`input.document` is the canonical draft. Do not read or write the destination
file; it may be absent or contain an older version and publication owns that
file.

Act as the documentation lead and coordinate these private specialists:

1. Invoke `documentation-researcher` to inspect the issue, repository, and
   relevant source files. Require path-based evidence and explicit unknowns.
2. Invoke `documentation-writer` with the request and research report. Require
   a complete Markdown draft written for the issue's intended audience.
3. Invoke `documentation-reviewer` with the request, research, and draft.
   Require factual, structural, clarity, and completeness checks.
4. When the reviewer reports material problems, invoke
   `documentation-writer` once more with the review notes, then invoke
   `documentation-reviewer` once more on the revision.

Keep the specialists distinct: the researcher gathers facts, the writer owns
the prose, the reviewer judges quality, and the lead resolves disagreements
and owns the final result. Never invent repository behavior. If evidence is
missing, say so in the document.

Match the document's depth to the requested document type and desired outcome.
For a practical usage guide, prefer roughly 150 to 250 lines unless the brief
or verified evidence clearly requires more. Include only the detail readers
need to complete the desired outcome. Exclude internal implementation detail
and unrelated workflows unless the brief explicitly asks for them.

Use stable evidence references. For hydrated or generated files, cite the path
and a stable identifier such as a JSON key, workflow step ID, or heading. Do
not require exact line-number ranges for hydrated or generated files. A
line-number-only difference is not a material documentation defect.

Return exactly one JSON object with no Markdown fence or surrounding prose:

```json
{
  "version": 1,
  "status": "pass",
  "summary": "The draft passed the internal specialist review.",
  "title": "Document title",
  "document": "# Complete Markdown document",
  "source_evidence": ["path/to/file: fact supported by this source"],
  "review_notes": []
}
```

Return `changed` when a material issue remains after the allowed internal
revision, `blocked` when the brief or evidence cannot support a responsible
draft, and `pass` otherwise. Keep `source_evidence` concise and include only
sources actually inspected.

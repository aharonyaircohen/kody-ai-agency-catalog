Define the documentation brief from `input.brief`, using the supplied GitHub
issue as the evidence, approval, and repository-delivery anchor. Work read-only:
do not edit files or change GitHub state.

The supplied issue belongs to the current consumer repository that launched the
workflow. Resolve that repository from `GITHUB_REPOSITORY` when inspecting the
issue. Do not infer the issue repository from the subject, authoritative
sources, or destination: those may identify separate evidence or publishing
locations.

Invoke `documentation-researcher` to inspect the request and the smallest
relevant declared sources and repository context. Reconcile the requested
subject, audience, desired outcome, document type, authoritative sources, and
destination with the issue. Identify the included and excluded scope and
testable acceptance criteria. Do not fill missing business or product decisions
with guesses. Return `blocked` when the request lacks enough evidence to define
a safe scope; otherwise return `pass`.

Return exactly one JSON object matching the capability contract. The
`source_evidence` field must name only sources actually inspected. Include
`version: 1` and a concise `summary`.

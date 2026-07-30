# Build Chat Knowledge Graph

Build one small, evidence-backed knowledge graph whose only purpose is to
improve Kody Chat's answers. Transform the normalized evidence bundle supplied
by the previous workflow step; source collection is not this capability's
responsibility.

Use the bundled `company-understanding` skill as the authoritative question
set and graph-admission policy.

## Input

- `request.companyInstructions` may describe what the company wants Kody to
  understand. Treat it as scope, never as proof of a company fact.
- `request.companyQuestions` contains up to ten reviewed company-specific questions.
  Add them to the standard questions in the skill.
- `sources` contains normalized, source-backed evidence collected by the
  previous capability.
- `sourceCoverage` records which source kinds were collected, empty,
  unavailable, or not approved.

Do not browse for additional evidence. If the bundle is blocked, incomplete,
or contradictory, represent that honestly in coverage and gaps.

## Method

1. Load the standard questions and admission rules from the skill.
2. Add the reviewed `companyQuestions`, if any.
3. Read the supplied evidence and source-coverage report.
4. Extract only concepts and relationships needed to answer an active
   question. Do not index every file, symbol, issue, or record.
5. Give each real concept one stable identifier. Keep two entities separate
   when the evidence does not prove they are the same.
6. Attach one or more source IDs to every node and edge.
7. Record `answered`, `partial`, or `missing` coverage for every active
   question. Put missing evidence in `gaps`; never fill a gap with a guess.
8. Propose up to ten new company-specific questions when the sources reveal a
   valuable decision that the active set does not cover. Proposals are not
   active until reviewed in a later run.
9. Before returning, reject duplicate node IDs, dangling edges, unknown source
   IDs, unsupported claims, and evidence outside the approved scope.
10. Keep the result compact: at most 60 nodes and 120 edges. Reuse a concept
    across questions instead of creating question-specific duplicates. Copy
    only sources referenced by the final graph or coverage report.
11. Ensure every `answered` or `partial` question has at least one searchable node
    whose label and summary directly contain the supported answer and
    whose `sourceIds` cite its evidence. Reuse one node across related
    questions when appropriate. Coverage metadata alone never makes an answer searchable.

Prefer connections that help Chat reason across company, project, repository,
data, work, and AI Agency knowledge.

## Output

Return exactly one JSON object matching `contract.json`.

Your final response must contain only the raw JSON object. Do not return a
summary, explanation, Markdown fence, or file path. If you use a temporary file
to validate the graph, read it and return its exact JSON contents as the final
response; saving the file is not a substitute for returning the object.
Build the final object in memory and return it directly; do not use file-writing
tools merely to construct the response.

- `status` is `built` when the graph and coverage report are valid.
- `status` is `blocked` when required sources cannot be accessed or the output
  cannot be supported. A blocked result still returns empty graph arrays,
  coverage, and explicit gaps.
- `sources[].evidence` must be a short relevant excerpt or a precise structured
  fact, not an unsupported summary.
- `observedAt` must record when the source was read.

Do not publish the graph, register a Chat tool, create a schedule, edit source
material, or present a graph UI. Those responsibilities belong outside this
capability.

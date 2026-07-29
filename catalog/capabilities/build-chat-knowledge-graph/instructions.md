# Build Chat Knowledge Graph

Build one small, evidence-backed knowledge graph whose only purpose is to
improve Kody Chat's answers.

Use the bundled `company-understanding` skill as the authoritative question
set and graph-admission policy.

## Input

- `companyInstructions` may describe what the company wants Kody to
  understand. Treat it as scope, never as proof of a company fact.
- `companyQuestions` contains up to ten reviewed company-specific questions.
  Add them to the standard questions in the skill.
- `approvedSources` lists extra sources that this run may read. Do not read
  unlisted business-data sources.

Repository content, repository-scoped GitHub work, and installed Kody Agency
definitions may be inspected through the tools already available to the run.
Never read secrets or copy raw sensitive customer records into the graph.

## Method

1. Load the standard questions and admission rules from the skill.
2. Add the reviewed `companyQuestions`, if any.
3. Inspect available approved sources and record exact evidence.
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

Prefer connections that help Chat reason across company, project, repository,
data, work, and AI Agency knowledge. Exact source details remain in their
source and should be fetched later when Chat needs them.

## Output

Return exactly one JSON object matching `contract.json`.

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

# Collect Chat Knowledge Evidence

Collect a bounded, current evidence bundle for the Chat knowledge graph. Work
read-only and invoke `knowledge-evidence-researcher`.

## Responsibilities

1. Preserve only supplied request fields under `request`; scope is not
   evidence. Omit absent optional fields and never replace them with empty
   strings or placeholder values.
2. Inspect only sources available through the run's existing permissions.
3. Collect atomic evidence across company, project, repository, data, work,
   and Agency knowledge.
4. Add question IDs only when the supplied custom questions make the mapping
   explicit; question policy belongs to the graph builder.
5. Report source coverage honestly, including empty and unavailable sources.

Inspect relevant repository content and documentation. When available, also
inspect current issues, pull requests, builds, releases, Agency definitions and
Agency runs. Approved business-data sources may be read only for their stated
purpose. Never read secrets or copy sensitive customer records.

## Operational evidence

When the `gh` CLI is authenticated, resolve the repository from
`GITHUB_REPOSITORY`; otherwise use `gh repo view --json nameWithOwner`. Do not
hard-code an owner, repository, provider, workflow name, or branch.

Inspect at most 20 recent runs with `gh run list`. For recent failed runs, use
`gh run view` with `--log-failed` to capture the failed step and direct error
cause. Keep only short, non-secret excerpts and stable run URLs or IDs. Also
inspect bounded current issues, pull requests, and releases when those GitHub
resources exist. Perform independent read-only queries in parallel when
possible.

GitHub Actions runs created by an Agency workflow are operational execution
evidence, but they are not a replacement for durable Agency run records.
Convex-owned Agency run records must be reported as unavailable unless the
current capability run is given an explicit authenticated reader for them.
Never call a user-session Dashboard endpoint from the capability.

Do not assume any repository name, hosting provider, issue tracker, CI system,
database, folder layout, Agency definition format, or deployment platform.
Use the tools and source locators supplied by the current consumer agency.

Keep at most 200 evidence records. Prefer current decision-making facts over
large inventories. Every record must contain one exact locator, observation
time, short evidence excerpt or structured fact, and relevant question IDs.
Use stable source IDs that describe the source rather than its list position.

Return `blocked` only when no responsible graph can be built. Missing one
source kind is normally `ready` with an explicit coverage status.

Return exactly one raw JSON object matching `contract.json`. Do not build the
graph, publish a tool, edit a source, or trigger work.

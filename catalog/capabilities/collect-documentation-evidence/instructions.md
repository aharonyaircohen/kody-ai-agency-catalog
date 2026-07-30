Build an evidence ledger for the supplied business brief and issue. Work
read-only and invoke `documentation-researcher`.

Inspect every accessible source declared by `input.brief.authoritativeSources`,
plus relevant source, tests, configuration, existing documentation, and public
interfaces. Record atomic facts as `verified_facts` with their sources. Record
missing or conflicting evidence as unknowns. Prefer executable behavior and
tests over descriptive prose when they disagree. Return `blocked` only when the
missing evidence prevents responsible documentation; otherwise return `pass`.

Return exactly one JSON object matching the capability contract. Include
`version: 1` and a concise `summary`.

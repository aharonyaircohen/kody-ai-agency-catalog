Build an evidence ledger for the documentation request in the supplied issue.
Work read-only and invoke `documentation-researcher`.

Inspect the relevant source, tests, configuration, existing documentation, and
public interfaces. Record atomic facts with their source paths. Record missing
or conflicting evidence as unknowns. Prefer executable behavior and tests over
descriptive prose when they disagree. Return `blocked` only when the missing
evidence prevents responsible documentation.

Return exactly one JSON object matching the capability contract.

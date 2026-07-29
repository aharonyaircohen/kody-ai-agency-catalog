Perform a read-only documentation maintenance sweep and invoke
`documentation-researcher`.

Compare current documentation with changed public interfaces, configuration,
routes, schemas, commands, examples, and product behavior supported by source
and tests. Identify concrete stale claims, missing coverage, broken links, or
obsolete examples. Deduplicate findings against existing documentation work.
Do not rewrite, publish, delete, commit, or silently change documentation.
Return proposals with evidence so a human can choose whether to start a normal
documentation workflow.

Return `current` with empty findings and proposals when no verified drift is
found. Return exactly one JSON object matching the capability contract.

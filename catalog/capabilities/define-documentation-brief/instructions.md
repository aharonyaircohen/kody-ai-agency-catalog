Define the documentation brief for the supplied GitHub issue. Work read-only:
do not edit files or change GitHub state.

Invoke `documentation-researcher` to inspect the request and the smallest
relevant repository context. Identify the intended audience, the reader outcome,
the included and excluded scope, and testable acceptance criteria. Do not fill
missing product decisions with guesses. Return `blocked` when the request lacks
enough evidence to define a safe scope.

Return exactly one JSON object matching the capability contract. Evidence must
name only sources actually inspected.

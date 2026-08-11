# Finalize CI Repair

Finish CI Repair deterministically after at most one repair attempt and one CI verification.

Do not edit code, create another repair attempt, or retry CI. Return `completed` when CI is healthy. Otherwise return `blocked`. Always include the complete structured report required by the output contract so the user knows what failed, what was tried, why automation stopped, and what to do next.

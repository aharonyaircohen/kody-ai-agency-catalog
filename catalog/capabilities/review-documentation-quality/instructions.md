Review the current documentation set for reader success after example and
accuracy checks pass. Work read-only and invoke `documentation-reviewer`.

Check completeness against the brief, navigation, clarity, accessibility,
terminology, prerequisites, troubleshooting, link intent, and consistency.
Return `revise` for concrete reader-facing defects. Return `blocked` if the
draft or upstream verification results are unavailable. Do not repeat resolved
findings or invent style objections that do not affect reader success.

Return exactly one JSON object matching the capability contract.

# Instructions

Use the `cleanup-branches` skill.

Delete only branches whose linked task is closed, done, or failed. Preserve
protected branches, branches with open pull requests, and ambiguous links.

Return `DONE` with a short `PR_SUMMARY`, or `FAILED: <reason>`.


---

# Cleanup Branches

Delete only stale task branches whose linked task is closed, done, or failed.
Protected branches, open pull requests, and ambiguous task links are skipped.

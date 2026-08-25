# Comment Reviewed Issue Pull Request

Update Kody's managed resolution comment on the supplied issue after the
Workflow has reviewed the supplied pull request successfully.

Verify that both items belong to `GITHUB_REPOSITORY`, the issue is open, the
pull request is open, and its body contains `Closes #<issue>`. If any check
fails, report the exact blocker in the managed comment and return
`status: "commented"`; do not repair or replace either item.

Replace the managed marker with:

`<!-- kody:issue-resolution:v1 status=reviewed pr=<pr> -->`

Link the pull request and say it is ready for human review and merge. State that
the issue remains open until the pull request merges. Do not change labels,
close or merge anything, edit files, create commits, or create another comment.

Return exactly one JSON object matching the contract.

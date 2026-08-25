# Comment Stopped Issue Resolution

Update Kody's managed resolution comment on the supplied issue because the
Workflow could not produce a reviewed pull request.

Read the current Workflow result and the supplied issue. Explain the concrete
failure or blocker without exposing private reasoning, secrets, or raw command
output. Replace the managed marker with:

`<!-- kody:issue-resolution:v1 status=stopped -->`

Leave `kody:backlog` in place so a later scheduled run may retry. Do not add
another label, close the issue, merge a pull request, edit files, create
commits, or create another comment.

Return exactly one JSON object matching the contract.

Publish the reviewed documentation through the existing CMS adapter or
repository file surface selected by the request.
Treat `input.document` as the reviewed document to publish. Do not discover,
select, or substitute another repository document.

First verify explicit human approval in the supplied issue or the workflow's
authoritative approval context. Approval must identify the reviewed document
set or revision. If approval is absent, ambiguous, or older than the reviewed
revision, make no changes and return:

```json
{
  "version": 1,
  "status": "blocked",
  "location": "",
  "change_record": "",
  "summary": "Explicit human approval is required before publication."
}
```

Create or update only. Never delete documents, overwrite unrelated content, or
create a parallel publishing store. Preserve the selected system's normal
permissions, history, and transport. Publish exactly the reviewed document set;
if that content is unavailable, return `blocked`.

For repository files, edit the approved files and return `changed`. Do not
commit or push: the workflow delivery wrapper owns the branch, commit, push,
and pull request. The pull request is the change record and still requires its
normal merge approval. For a CMS operation that publishes immediately through
its approved adapter, return `pass` with the canonical location and durable
change identifier.

Return exactly one JSON object matching the capability contract. Include
`version: 1` and a concise `summary`.

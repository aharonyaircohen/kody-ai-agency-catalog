Turn one completed QA scan into a deduplicated, ranked GitHub issue set.

Rank every finding before searching GitHub. For each finding assign priority,
risk, effort, and confidence. After ranking, check for a published QA
issue-sync report whose source scan ID is `{{args.scanId}}`, then search open
and closed issues for the exact stable finding marker
`<!-- kody:qa-finding:<finding-id> -->`. A prior processing report means the
scan is already processed, but its findings must still appear in the ranked
output and no issue may be created or changed.

If a matching issue exists, record it as `existing`. Do not edit, comment on,
reopen, or close an existing issue. If none exists, create one issue containing
the title, reproduction, expected and actual behavior, evidence, rank, source
scan ID, and stable finding marker. Process at most five findings.

Select at most one open issue for delivery. Return `continue` only when it is
high priority, low risk, low effort, and high confidence. Return `approval` for
any other selected issue. Return `stop` when there is no actionable open issue,
the scan is blocked/pass, or this scan was already processed.

Set `syncStatus` to `synced`, `already-processed`, or `blocked`; do not use a
top-level `status` field because scan quality is data, not execution failure.

The processing report is the durable receipt: `processingId` must be
`qa-issue-sync-<scanId>`, and `issues` must map every processed finding to its
existing or newly created issue. Return exactly one JSON object matching the
contract and no surrounding text.

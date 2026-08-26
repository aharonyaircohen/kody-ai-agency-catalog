# GitHub Issue Maintenance

The **GitHub Issue Maintenance** Solution assesses incoming issues and turns
accepted backlog issues into reviewed pull requests. It uses the existing Kody
Agent and built-in delivery capabilities; it does not merge pull requests.

## Before enabling it

- Install the Solution from the Dashboard Store Catalog for the selected
  repository.
- Confirm the repository has the supported `kody:backlog` and `duplicate`
  labels and that Kody can read and update issues and pull requests.
- Keep only one installed copy of each Loop per repository. Claims are managed
  through GitHub comments, so simultaneous copies cannot claim work atomically.
- Both Loops ship disabled. Enable **Issue Intake** first and inspect its first
  decisions before enabling **Backlog Resolution**.

## Issue Intake

Every 15 minutes, **Issue Intake** processes at most one new or changed open
issue:

- A clear, repository-owned issue receives a comment and `kody:backlog` and
  remains open.
- A verified exact duplicate receives a link to the original issue, receives
  `duplicate`, and closes.
- An unclear request or uncertain duplicate receives a comment explaining what
  is missing and remains open without a new label.

Kody updates one managed assessment comment instead of posting repeated
comments. It skips unchanged issues and issues already being built or reviewed.

## Backlog Resolution

Every 15 minutes, **Backlog Resolution** processes at most one open
`kody:backlog` issue. It skips issues with active Kody work, an active claim, a
queued or running Kody Actions run, or a linked open pull request.

Kody claims the issue, prepares a pull request, reviews it, and may perform up
to three fix attempts. A successful run links the reviewed pull request in the
managed issue comment. Kody never merges the pull request; the issue remains
open until GitHub closes it after that pull request is merged.

If work stops or remains blocked, Kody explains why in the managed comment and
keeps `kody:backlog` so a later run can retry. An in-progress claim expires
after two hours.

## Pausing and oversight

Disable either Loop to pause that part of the process. Existing issue comments,
labels, branches, and pull requests remain unchanged. Review the first intake
decisions and pull requests before leaving both Loops enabled unattended.

Issue text and comments are treated as untrusted evidence, not instructions.
Do not manually edit Kody's hidden assessment or resolution markers unless you
intend the issue to be reassessed or reclaimed.

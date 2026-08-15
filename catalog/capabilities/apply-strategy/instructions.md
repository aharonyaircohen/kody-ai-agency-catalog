# Apply Strategy

Apply the supplied Strategy Blueprint to the current repository now.

The Blueprint defines the outcome and boundaries. Its supplied instructions
define repository-specific judgment. Inspect the real repository, create only
the native files required for that outcome, and verify the exact commands you
put into those files. Reuse compatible existing behavior. Do not generate
Agency items that the Blueprint already activates from the Store.

Produce the repository diff before running expensive repository-wide
validation. After a brief, bounded inspection, first merge the supplied
configuration patch, write the exact supplied files, and create the smallest
repository-native implementation. Then run focused checks for the changed
files. Pull-request CI owns the full validation; do not spend the Constructor
window running the complete typecheck, lint, unit, and build suites before a
diff exists.

When `installation.configPatch` is supplied, merge that patch into
`kody.config.json` without removing existing values. This Store installation
change belongs in the same pull request as the repository-specific result;
never commit it directly to the default branch.

When `installation.files` is supplied, write every file to its exact supplied
repository-relative path with its exact supplied content. These are trusted
Store-owned Maintainer definitions prepared for this Constructor run. Do not
rename, reinterpret, or regenerate them. Deliver them in the same pull request
as the repository-specific result.

Before reporting success, inspect the repository diff. Every supplied
`installation.files` path must exist with the exact supplied content, the
configuration patch must be present, and the diff must contain at least one
allowed repository file. Do not describe a planned or unchanged file as
evidence. If no repository diff exists, return `blocked` instead of `applied`.

Work on the prepared issue branch. The Workflow owns commits, pushes, and pull
request creation. Return `blocked` without editing when the repository is
unsupported, a required owner decision is missing, or the requested outcome
would require weakening a security boundary.

Write the final JSON result to the capability output file. Return `applied`
only when repository files changed and focused verification passed.

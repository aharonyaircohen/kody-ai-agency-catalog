# Apply Strategy

Apply the supplied Strategy Blueprint to the current repository now.

The Blueprint defines the outcome and boundaries. Its supplied instructions
define repository-specific judgment. Inspect the real repository, create only
the native files required for that outcome, and verify the exact commands you
put into those files. Reuse compatible existing behavior. Do not generate
Agency items that the Blueprint already activates from the Store.

When `installation.configPatch` is supplied, merge that patch into
`kody.config.json` without removing existing values. This Store installation
change belongs in the same pull request as the repository-specific result;
never commit it directly to the default branch.

Work on the prepared issue branch. The Workflow owns commits, pushes, and pull
request creation. Return `blocked` without editing when the repository is
unsupported, a required owner decision is missing, or the requested outcome
would require weakening a security boundary.

Write the final JSON result to the capability output file. Return `applied`
only when repository files changed and focused verification passed.

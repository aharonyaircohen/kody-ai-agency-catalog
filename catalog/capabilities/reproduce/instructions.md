# Bug Reproduction

Reproduce the supplied GitHub issue before any production fix is attempted.

Read the repository guidance, the issue, the affected code, and the nearest
existing tests. Add the smallest focused regression test that demonstrates the
reported failure. Do not edit production code.

Run the focused test and confirm it fails for the reported reason. If the issue
cannot be reproduced safely, do not invent a failure; return `not-reproduced`
with the evidence and stop changing files.

Return exactly one JSON object matching the capability contract. For a
successful reproduction, include the test path and a stable failure signature.
The delivery wrapper owns the checkpoint commit. Do not run git or GitHub
commands and do not create a pull request.

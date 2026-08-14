# Healthy CI

Inspect the repository before proposing any files. Read its existing GitHub
Actions, manifests, lockfiles, workspace configuration, runtime files, scripts,
test configuration, and documented security policy.

Create or improve the smallest native GitHub Actions workflow that runs the
repository's verified install, lint, typecheck, test, and build commands when
those commands actually exist. Adopt compatible existing CI instead of
replacing it. Never invent commands, weaken policy, or copy one package-manager
template into every repository.

Run focused local verification before delivery. The resulting pull request is
the repository-specific implementation. Include the supplied Store activation
patch in that same pull request so CI Repair becomes the ongoing failure
handler only after the repository accepts the change. Do not recreate its
Workflow inside the native CI file and do not commit activation directly to the
default branch.

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
the repository-specific implementation. CI Repair is activated separately as
the ongoing failure handler; do not recreate its Workflow inside the native CI
file.

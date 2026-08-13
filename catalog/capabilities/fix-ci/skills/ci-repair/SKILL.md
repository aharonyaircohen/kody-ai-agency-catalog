---
name: ci-repair
description: Repair the exact failing CI run supplied to the capability.
---

# CI Repair

Use the supplied failed-step evidence as the source of truth.

- For a compile or type error, repair the code without suppressing the check.
- For a failing test, read that test and its implementation, then repair the
  incorrect behavior. Change the test only when it demonstrably encodes the
  wrong requirement.
- For lint or formatting, make the smallest compliant edit.
- For a missing dependency, distinguish an incorrect import from a genuinely
  missing direct dependency.
- For infrastructure failures, return `blocked`; do not invent a code change.
- For dependency age, provenance, signature, or allowlist failures, preserve the
  repository's security policy. Do not downgrade, replace, or rewrite a lockfile
  merely to bypass it; return `blocked` with the safe owner decision.

Never skip tests, weaken assertions, add retries or sleeps, blindly update
snapshots, disable checks, or silence type and lint errors.

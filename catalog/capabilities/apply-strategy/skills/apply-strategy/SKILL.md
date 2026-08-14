---
name: apply-strategy
description: Adapt an approved Strategy Blueprint to the current repository.
---

# Apply Strategy

Use repository evidence as the source of truth. Follow the supplied Blueprint,
change only repository-native files needed for its outcome, and verify the
proposed implementation before returning success.

If the input includes `installation.configPatch`, merge it into
`kody.config.json`, preserving existing fields and list entries. Deliver that
configuration in the same pull request as the Blueprint implementation.

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

If the input includes `installation.files`, write each exact path and content
without modification. They are Store-owned Maintainer files that the temporary
Constructor must deliver in the same pull request.

Before returning success, inspect the repository diff and verify the supplied
files and configuration patch are actually present. Never claim a planned or
unchanged file as completed evidence; return `blocked` when no diff exists.

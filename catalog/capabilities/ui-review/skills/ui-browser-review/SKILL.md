---
name: ui-browser-review
description: Verify a pull request's changed UI in its matching preview with Playwright.
---

# UI Browser Review

1. Read the PR metadata, changed files, diff, and head SHA with read-only `gh`
   commands.
2. Decide whether the PR changes a user-visible surface. If it does not, review
   the diff only and skip all browser setup.
3. Run the capability-owned `tools/scripts/resolve-preview.sh` with the PR
   number and optional `previewUrl`. It accepts HTTP(S) URLs or selects a
   successful deployment for the exact PR head SHA. Never substitute an
   unrelated URL.
4. For a UI-affecting PR, create one focused Playwright spec under
   `.kody/ui-review/`. Install Chromium through Playwright when unavailable.
5. Exercise the smallest flow that proves the change. Check loading, empty,
   error, mobile, and keyboard states when relevant and safely reachable.
6. Capture screenshots under `.kody/ui-review/` and inspect them before deciding.
7. Return `pass` only for verified UI behavior. Return `fix` with concise,
   actionable evidence for a broken or unverified UI-affecting change.

Never include credentials in specs, screenshots, output, or logs. Never edit
tracked source files or run GitHub write commands.

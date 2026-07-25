# release

Single-job release flow: prepare → wait CI → merge → publish → deploy → notify. No orchestrator chain — runs end-to-end inside one workflow run.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `issue` (integer, needed): GitHub issue number that triggered the release.
- `bump` (string): Version bump increment. Default patch.
- `dry-run` (boolean): Print plan without writing files, committing, or opening a PR.
- `prefer` (string): On release/vX.Y.Z branch collision: 'ours' force-pushes; 'theirs' reuses the existing PR.

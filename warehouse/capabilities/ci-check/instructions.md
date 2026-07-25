# ci-check

Check GitHub CI status for a PR and optionally report the result to a managed goal. No agent.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `pr` (integer, needed): Pull request number to check.
- `goal` (string): Managed goal id to report CI evidence to.
- `evidence` (string): Evidence key to set on the goal. Default ciGreen.
- `timeout-seconds` (integer): Maximum time to wait for pending checks before reporting not-green. Default 0.
- `poll-seconds` (integer): Seconds between CI polls while waiting. Default 30.

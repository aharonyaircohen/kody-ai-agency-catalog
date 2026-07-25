# Verify Deployment Live

## Purpose

Confirm a deployment URL is live after a release deploy step.

## Contract

- Input is a URL.
- Verify the URL responds with the expected HTTP status.
- Report pass/fail evidence to a managed goal when `--goal` is provided.
- Do not deploy or mutate infrastructure.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `url` (string, needed): Deployment URL to verify.
- `expected-status` (integer): Expected HTTP status. Default 200.
- `goal` (string): Managed goal id to report deployment evidence to.
- `evidence` (string): Evidence key to set on the goal. Default deploymentLive.

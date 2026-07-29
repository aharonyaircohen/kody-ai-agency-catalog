# vercel prod deploy

## Job

Deploy the `main` branch to Vercel Production using the project's production configuration.

## Execution

Engine executes `tools/run.sh` directly in its trusted script runtime. No agent is involved.

The contract grants only the three declared Vercel secrets to that process. Non-secret deploy config comes from `.kody/variables.json` and repository config.

## Allowed Commands

- `tools/run.sh`

## Restrictions

- Manual only.
- Deploys the configured production branch, default `main`.

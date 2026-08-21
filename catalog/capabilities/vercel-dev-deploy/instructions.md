# Vercel dev deploy

## Job

Deploy the configured development branch to Vercel Preview and keep the configured stable development URL pointed at the new deployment.

## Execution

Engine executes `tools/run.sh` directly in its trusted script runtime. No agent is involved.

The contract grants only the three declared Vercel secrets. The development branch defaults to `dev`. The run may select a Vercel target such as `preview` or `dev` and may provide a stable `devUrl`; repository configuration and variables remain compatible fallbacks.

## Allowed Commands

- `tools/run.sh`

## Restrictions

- Manual only.
- Never creates or promotes a Vercel production deployment.

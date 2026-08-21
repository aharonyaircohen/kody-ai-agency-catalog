# Vercel dev deploy

## Job

Deploy the configured development branch to Vercel Preview and keep the configured stable development URL pointed at the new deployment.

## Execution

Engine executes `tools/run.sh` directly in its trusted script runtime. No agent is involved.

The contract grants only the three declared Vercel secrets. The development branch defaults to `dev`; the stable URL comes from `release.devUrl`, `qa.fallbackUrl`, or the `DEV_URL` repository variable.

## Allowed Commands

- `tools/run.sh`

## Restrictions

- Manual only.
- Never creates or promotes a Vercel production deployment.

# Quality check

Run exactly one repository-owned live test selected by its stable Quality test ID. Preserve the generated Playwright evidence path and machine counts in the result.

The Engine executes `tools/run.sh` directly. No agent chooses or rewrites the test. The target URL and source commit come from the authenticated Quality Run request.

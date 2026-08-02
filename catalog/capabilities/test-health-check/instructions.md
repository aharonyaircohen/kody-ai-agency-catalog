# Check Test Health

Run the repository-owned test health commands without editing files.

- Read `quality.testUnit` and optional `quality.coverage` from `kody.config.json`.
- Repeat the test command to expose inconsistent outcomes.
- Measure duration and inspect common disabled or focused-test markers.
- Treat consistent test failures, inconsistent outcomes, and a failing configured coverage gate as repairable.
- Report missing coverage configuration, slow tests, and disabled or focused tests as findings without changing code.
- Create or reuse one repair issue only for a clear repairable failure.
- Never delete tests, weaken assertions, lower thresholds, or claim that a command passed when it did not.

The owning Workflow decides whether to start repair work. This capability only observes, records evidence, and returns its structured result.

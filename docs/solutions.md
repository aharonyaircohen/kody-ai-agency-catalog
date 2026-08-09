# Solutions

A Solution is a complete installable setup built from existing Store assets.
Its folder contains only `solution.json`:

```text
catalog/solutions/<slug>/solution.json
```

The manifest declares `schemaVersion: 1`, an id matching the folder name, a
name, a description, and at least one Workflow, Pipeline, Loop, or Trigger
entry point. The Store
and Dashboard derive every Agent, Capability, and nested Workflow dependency
from those entry points.

Install a Solution from the Dashboard's **Store Catalog** for the selected
repository. Installation activates all dependencies shown in the Solution tree.
Removing a Solution removes its entry points. It does not automatically remove
the activated Agent and Capabilities because those assets may be shared.

## Documentation

The `documentation` Solution contains:

- `documentation-agency`, which researches, drafts, tests, reviews, revises,
  publishes, and verifies an approved document set.
- `documentation-maintenance`, an enabled seven-day Loop targeting
  `maintain-documentation` to detect evidence-backed drift.

Publication is approval-gated. Repository publication creates or updates the
approved files and hands delivery to the pull-request wrapper. Maintenance is
read-only: it reports drift and proposes the normal documentation Workflow.

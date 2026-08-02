# Maintenance

Keep Store assets reusable and free of consumer runtime state.

Before committing:

```sh
npm run validate:capabilities
npm test
npm run validate:store
git diff --check
```

Do not add a separate runtime profile or Implementation catalog. If two
execution methods differ, create two Capability folders. Reusable scheduled
Loop definitions belong in `catalog/loops/`; consumer Loop instances, Todos,
Runs, approvals, and secrets do not.

The `documentation` Solution provides the normal documentation lifecycle for a
consumer repository:

1. Install **Documentation** from the Dashboard Store Catalog for the selected
   repository. This activates the creation Workflow, weekly maintenance Loop,
   Agent, and required Capabilities.
2. Start `documentation-agency` with a GitHub issue and a complete brief. The
   brief must name the subject, audience, reader outcome, document type,
   authoritative sources, and approved destination.
3. Approve the reviewed document revision before publication. Repository
   delivery proposes a pull request; it does not commit directly to `main`.
4. Let `documentation-maintenance` run every seven days. It reports verified
   drift and proposes follow-up work; it does not silently rewrite documents.

Do not install the Solution into this Store merely to edit Store catalog docs.
The Store is the source of those definitions, not their consumer. Audit Store
docs against the catalog and validators, then review and commit the scoped doc
changes normally.

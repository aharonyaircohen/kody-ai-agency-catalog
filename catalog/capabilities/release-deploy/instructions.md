# Release deploy

Dispatch the production deployment workflow configured by the consumer
repository, wait for the exact new run, require success, and verify the
configured public production URL.

The capability is deployment-provider neutral. Provider credentials and
deployment mechanics remain owned by the consumer workflow.

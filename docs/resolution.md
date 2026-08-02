# Resolution

For Agents, Capabilities, and Workflows, consumer-local assets override Store
assets with the same id. Engine built-ins are the final fallback.

The order is:

```text
consumer-local -> Store -> Engine built-ins
```

Solutions do not add another resolution layer. They activate existing Store
entry points and their derived dependencies for the selected consumer.

The Store is a catalog. Reusable Loop definitions may live here, but consumer
Loop instances, Todos, Runs, approvals, and secrets remain consumer-owned.

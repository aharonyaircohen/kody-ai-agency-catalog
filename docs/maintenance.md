# Maintenance

Keep Store assets reusable and free of consumer runtime state.

Before committing:

```sh
npm run validate:capabilities
npm test
```

Do not add a separate runtime profile or Implementation catalog. If two
execution methods differ, create two Capability folders. Keep schedules,
Todos, Loops, and Runs out of the Store.

# Prepare CI Repair

Resolve the task that owns one failed CI run. Pass through its existing pull
request when present. Otherwise create or reuse a branch-specific repair issue
so the Workflow can implement the fix and open a pull request. This
deterministic Capability owns repair-task state only; it does not inspect CI or change code.

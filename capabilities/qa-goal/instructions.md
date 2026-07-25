# QA Goal

Run one QA goal workflow.

## Input

This capability receives one JSON value. When it is an object, it understands:

- `issue` (integer, needed): Issue number carrying qa-engineer's QA report (the comment with the <!-- KODY_QA_REPORT_JSON --> block).
- `scope` (string): Optional scope label for the goal name (e.g. the changelog entry title). Defaults to 'smoke'.
- `goal` (string): Optional existing goal id to attach findings to instead of creating a new one.

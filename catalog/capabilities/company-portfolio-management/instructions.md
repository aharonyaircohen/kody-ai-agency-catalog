# Instructions

Use the `company-portfolio-management` skill. Run only this capability's job;
the owning loop decides when it runs.

Finish with `DONE` and a short `PR_SUMMARY`, or `FAILED: <reason>`.


---

# Company Portfolio Management

## Job

Review active company intents, company results, opportunities, and the existing
`ceo-performance-review`. Set the company's priorities; do not design or operate
the agency.

## Output

Record a short portfolio decision whose every priority includes an `intentId`,
expected value, evidence, and next owner.

## Restrictions

- No active company intents means no new priority.
- Do not create, activate, pause, or edit agency entities.
- Respect each intent's policy and human-approval requirements.
- Prefer a small ranked portfolio over a long backlog.

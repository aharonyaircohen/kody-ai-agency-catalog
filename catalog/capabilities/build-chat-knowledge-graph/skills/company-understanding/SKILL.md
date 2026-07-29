---
name: company-understanding
description: Build a small evidence-backed graph that improves Kody Chat on company, project, repository, data, work, and AI Agency questions.
---

# Company Understanding

## Purpose

Build one connected graph that helps Kody Chat answer valuable questions. Do
not build one graph per question or category.

The graph is successful only when it improves Chat's correctness, evidence,
missing-information detection, or effort. Node count and visual complexity are
not success measures.

## Standard Questions

Each expected answer describes required facts, not fixed wording. Source types
are examples; use only sources available and approved for the run.

## Company and Business

### CB-01: What does the company provide, and who is it for?

- Expected: Products or services, intended customers, and their main value.
- Sources: Company documentation, product documentation, approved business
  data.

### CB-02: What are the company's main business processes?

- Expected: Important processes, purpose, owners, inputs, and outcomes.
- Sources: Company documentation, process documentation, workflow definitions.

### CB-03: What business rules and constraints govern this area?

- Expected: Applicable rules, exceptions, limits, and evidence.
- Sources: Policies, product documentation, approved business data, source
  code.

### CB-04: Who owns this product, process, or decision?

- Expected: Responsible team or role and the scope of ownership.
- Sources: Company documentation, project ownership, repository ownership.

### CB-05: How does this product connect to company data, software, and Kody automation?

- Expected: Important data, systems, workflows, and capabilities with their
  relationships.
- Sources: Product documentation, data definitions, source code, Agency
  definitions.

## Project

### PJ-01: What are the project's current goals and intended outcomes?

- Expected: Active goals, success conditions, priority, and evidence.
- Sources: Project documentation, approved plans, issues.

### PJ-02: What requirements define this feature or project?

- Expected: Requirements, origin, acceptance conditions, and status.
- Sources: Product documentation, project documentation, issues.

### PJ-03: What important decisions were made, and why?

- Expected: Decision, alternatives, tradeoffs, date, and owner when known.
- Sources: Decision records, documentation, issues, pull requests.

### PJ-04: Who owns the current work, and what is blocking it?

- Expected: Owner, status, blockers, dependencies, and latest evidence.
- Sources: Issues, pull requests, project documentation.

### PJ-05: Where is this requirement implemented, tested, and released?

- Expected: Links from requirement to issue, pull request, code, tests, and
  release state.
- Sources: Issues, pull requests, source code, tests, releases.

## Repository and Technology

### RT-01: How is the repository organized, and what are its main runtime parts?

- Expected: Major packages or services, responsibilities, and runtime entry
  points.
- Sources: Source tree, package manifests, architecture documentation.

### RT-02: How does a user request or system event move through the software?

- Expected: Important components and data flow from entry point to outcome.
- Sources: Source code, API definitions, event definitions, architecture
  documentation.

### RT-03: What does this service or package depend on, and what depends on it?

- Expected: Important dependencies and consumers, including external systems.
- Sources: Source code, manifests, deployment configuration, architecture
  documentation.

### RT-04: How is this part tested, built, released, and deployed?

- Expected: Tests, build steps, release path, deployment target, and required
  checks.
- Sources: Test configuration, CI workflows, deployment configuration,
  documentation.

### RT-05: What could be affected if this component changes?

- Expected: Direct and important indirect consumers, data, workflows, tests,
  and business behavior.
- Sources: Source code, dependency data, data definitions, Agency definitions,
  documentation.

## Data

### DA-01: What are the important business data concepts in this area?

- Expected: Business meaning, important attributes, and related concepts.
- Sources: Approved database metadata, data documentation, application models.

### DA-02: Where is this data stored, and which system owns it?

- Expected: Authoritative store, owning system or team, and derived copies.
- Sources: Approved database metadata, configuration, source code, data
  documentation.

### DA-03: Which systems create, read, update, or send this data?

- Expected: Producers, consumers, operations, and important transfer paths.
- Sources: Source code, API definitions, event definitions, workflows.

### DA-04: What access, privacy, retention, or compliance rules apply to this data?

- Expected: Controls, protected fields, retention rules, and policy evidence.
- Sources: Policies, approved schema metadata, access configuration,
  documentation.

### DA-05: What would be affected if this data's schema or meaning changed?

- Expected: Applications, reports, workflows, capabilities, integrations, and
  tests at risk.
- Sources: Schema metadata, source code, integrations, Agency definitions,
  tests.

## Work and Change

### WC-01: What important work is active, why does it matter, and who owns it?

- Expected: Active work, business reason, priority, owner, and status.
- Sources: Issues, project documentation, pull requests.

### WC-02: How does this issue connect to its implementation and delivery?

- Expected: Related pull requests, changed code, tests, checks, and release
  state.
- Sources: Issues, pull requests, commits, CI, releases.

### WC-03: What important behavior changed recently?

- Expected: Changed user or system behavior, reason, affected areas, and
  delivery evidence.
- Sources: Pull requests, commits, releases, documentation.

### WC-04: What failed recently, and what caused it?

- Expected: Failure, affected system, evidence-backed cause, status, and
  related work.
- Sources: CI runs, Agency runs, issues, pull requests, incident records.

### WC-05: What should happen next, considering goals, dependencies, and risk?

- Expected: Evidence-backed next work, prerequisites, owners, and unresolved
  uncertainty.
- Sources: Goals, issues, pull requests, dependency data, run results.

## AI Agency

### AA-01: What can Kody currently do for this repository or company?

- Expected: Available capabilities, outcomes, limits, and readiness.
- Sources: Capability and implementation definitions.

### AA-02: How does Kody perform this kind of work?

- Expected: Connected goal, workflow, capability, implementation, agent, and
  tool path.
- Sources: Workflow, capability, implementation, agent, and tool definitions.

### AA-03: What starts this automation, and what does it require and produce?

- Expected: Trigger, inputs, preconditions, steps, outputs, and failure
  conditions.
- Sources: Workflow definitions, capability contracts, implementation
  definitions.

### AA-04: What controls make this automation safe and reliable?

- Expected: Sensors, supervisors, observers, verifiers, approvals,
  permissions, and policies.
- Sources: Agency definitions, approval policy, security configuration.

### AA-05: What happened during the latest relevant runs?

- Expected: Workflow and implementation used, result, evidence, failure reason,
  and affected work or systems.
- Sources: Agency run records, CI runs, issues, pull requests.

## Company-Specific Questions

After reading approved sources, propose up to ten company-specific questions.
Each proposal must:

- use real products, systems, datasets, processes, or workflows found in the
  sources;
- cover a decision or task users reasonably expect Kody Chat to help with;
- add useful knowledge not already covered by a standard question;
- define expected facts and authoritative source kinds;
- prefer valuable connections across the six knowledge areas.

Proposed questions require review before a later run may use them as active
questions.

## Graph Admission Rules

Add a fact or connection only when it:

- helps answer an active question or close variation;
- has source evidence;
- is inside the user's permissions and approved source scope;
- has a known source and observation time;
- is clearly separated from guesses or conflicting evidence;
- adds value beyond a simple direct source lookup.

Do not add large lists of files, symbols, issues, or records by default. Keep
important concepts and connections in the graph; leave exact details in their
authoritative source for Chat to fetch when needed.

Every node and edge must reference its source evidence. Report missing,
conflicting, or inaccessible knowledge as a gap instead of inventing an
answer.

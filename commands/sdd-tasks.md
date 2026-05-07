---
name: sdd-tasks
version: 0.1.0
phase: 1.4
contract: sdd-command-v1
workflow: workflows/tasks.yml
lifecycle_gate: phase-1.7-command-gate
---

# /sdd-tasks Command Contract

## Purpose

Create or refine `specs/<branch>/tasks.md` from approved spec and plan artifacts, preserving graph-ready task metadata.

## Inputs

- `specs/<branch>/spec.md`.
- `specs/<branch>/plan.md`.
- Existing `specs/<branch>/tasks.md` when present.
- Optional planner/scout artifacts.
- Templates/contracts:
  - `templates/tasks-template.md`
  - `schemas/contracts/sdd-task-contract.md`
  - `schemas/contracts/lifecycle-decision-contract.md`

## Lifecycle decision gate

Entry contract:

```text
user request -> `sdd lifecycle decide` -> profile/checkpoint -> tasks workflow
```

- Use the gate result to decide whether lightweight task boundary is enough or full task metadata is required.
- Direct profile skips full task generation only when the direct whitelist is satisfied.
- Hard gates require full task boundaries before implementation.
- If a run exists, record the decision with `sdd lifecycle decide --run <run_id>`.
- The gate may inspect/record decisions; it must not execute dependency waves, overlap gates, or implementation loops.

## Outputs

- Updated or proposed `specs/<branch>/tasks.md` with `sdd-task` blocks.
- Tasks checkpoint summary: task boundaries, dependencies, affected files, validation declarations, gaps, and implement readiness.

## Forbidden

- Do not implement the task parser.
- Do not execute dependency waves or overlap gates.
- Do not silently advance to `/sdd-do`.
- Do not create background write work.

## Success criteria

- Each task has stable id, status, wave, depends_on, affected_files, validation, risk, boundary, and acceptance.
- Blocking task gaps are surfaced before implementation.

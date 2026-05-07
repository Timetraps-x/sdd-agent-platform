---
name: sdd-plan
version: 0.1.0
phase: 1.4
contract: sdd-command-v1
workflow: workflows/plan.yml
lifecycle_gate: phase-1.7-command-gate
---

# /sdd-plan Command Contract

## Purpose

Create or refine `specs/<branch>/plan.md` from an approved spec, including technical approach, impact surface, risks, and validation strategy.

## Inputs

- `specs/<branch>/spec.md`.
- Existing `specs/<branch>/plan.md` when present.
- Project adapter and validation declarations.
- Optional read-only artifacts from `agents/scout.md`, `agents/spec-reviewer.md`, and `agents/planner.md`.
- Templates/contracts:
  - `templates/plan-template.md`
  - `schemas/contracts/lifecycle-decision-contract.md`

## Lifecycle decision gate

Entry contract:

```text
user request -> `sdd lifecycle decide` -> profile/checkpoint -> plan workflow
```

- Re-evaluate lifecycle signals when plan work reveals impact, validation, contract, or architecture uncertainty.
- Hard gates can upgrade to `full` or `research`; user preference cannot downgrade them.
- If a run exists, record the decision with `sdd lifecycle decide --run <run_id>`.
- Stop at checkpoint when confidence is low, policy/permission hits exist, or phase transition is requested.
- Do not launch agents/workflows from the gate in Phase 1.7.

## Outputs

- Updated or proposed `specs/<branch>/plan.md` content based on `templates/plan-template.md`.
- Plan checkpoint summary: chosen approach, rejected options, impact, validation strategy, gaps, and tasks readiness.

## Forbidden

- Do not implement code.
- Do not silently advance to `/sdd-tasks`.
- Do not bypass unresolved spec gaps.
- Do not duplicate runtime state machine logic in the command asset.

## Success criteria

- Technical approach and impact surface are reviewable.
- Validation strategy maps to acceptance.
- Blocking spec/plan gaps are surfaced before tasks creation.

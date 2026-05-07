---
name: sdd-spec
version: 0.1.0
phase: 1.4
contract: sdd-command-v1
workflow: workflows/spec.yml
lifecycle_gate: phase-1.7-command-gate
---

# /sdd-spec Command Contract

## Purpose

Create or refine `specs/<branch>/spec.md` as the SDD semantic source for requirements, scope, and acceptance.

## Inputs

- User intent and constraints.
- Existing `specs/<branch>/spec.md` when present.
- Project adapter: `.sdd/project.yml` or `templates/project-template.yml`.
- Canonical lifecycle model: `docs/architecture/lifecycle-decision-model.md`.
- Templates/contracts:
  - `templates/spec-template.md`
  - `schemas/contracts/lifecycle-decision-contract.md`

## Lifecycle decision gate

Entry contract:

```text
user request -> `sdd lifecycle decide` -> profile/checkpoint -> spec workflow
```

- Collect minimum lifecycle signals before writing spec content.
- Execute canonical hard gates from `docs/architecture/lifecycle-decision-model.md` through the TypeScript CLI/runtime contract.
- If a run exists, record the decision with `sdd lifecycle decide --run <run_id>`.
- Output profile, confidence, reasons, required/skipped stages, escalation triggers, and checkpoint need.
- Do not duplicate the runtime state machine or execute downstream workflow steps from the command prompt.

## Outputs

- Updated or proposed `specs/<branch>/spec.md` content based on `templates/spec-template.md`.
- Spec checkpoint summary: decisions, open questions, gaps, risk, and whether plan may start.

## Forbidden

- Do not implement code.
- Do not silently advance to `/sdd-plan`.
- Do not execute lifecycle gate logic in this asset.
- Do not overwrite runtime state/events directly.

## Success criteria

- Requirement, scope, non-goals, and verifiable acceptance are explicit.
- Spec gaps are listed instead of hidden.
- The next phase recommendation is checkpointed, not auto-executed.

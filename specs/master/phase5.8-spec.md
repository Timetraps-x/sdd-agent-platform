# Phase 5.8 Spec

## Metadata

- phase_id: `5.8`
- artifact: `phases/phase-5.8-semantic-document-contracts.md`
- lifecycle_profile: `full`
- status: `in_progress`

## Objective / Customer Value

Make SDD semantic documents useful as a real AI engineering harness: `spec.md` captures requirements, `plan.md` captures technical design, and `tasks.md` captures executable evidence boundaries.

## Problem / Intent

Current `spec.md` and `tasks.md` templates are readable but too thin to consistently express customer value, acceptance traceability, plan refs, agent/artifact requirements, and task-level Definition of Done.

## Scope

### In Scope

- Upgrade spec/tasks templates and init scaffolds.
- Upgrade dynamic instructions and generated Claude Code entries for `/sdd:spec` and `/sdd:tasks`.
- Update user-facing docs and tests for the three-layer contract model.

### Out of Scope

- Parser/inspect runtime field expansion beyond existing compatibility.
- Doctor/verify cross-document chain checks.
- Project management fields such as assignee, sprint, estimate, milestone.

## Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-5.8-1 | `spec.md` starter/template is a lightweight requirement contract with objective, actors/scenarios, scoped requirements, AC IDs, assumptions/dependencies, and risk gates. | init scaffold and template tests | Must |
| AC-5.8-2 | `tasks.md` starter/template is an execution evidence contract with Delivery Map, Wave Plan, acceptance_refs, plan_refs, agent/artifact/verification/autonomy fields, Definition of Done, and Evidence Expectations. | init scaffold and template tests | Must |
| AC-5.8-3 | Dynamic instructions and generated entries clearly separate spec/plan/tasks responsibilities. | instruction and AI entry tests | Must |

## Risks / Hard Gates

- generated-entry-drift: managed `.claude` entries must be refreshed after source changes.
- template-overload: templates must stay usable and not become enterprise bureaucracy.

## Lifecycle Decision Reference

- recommended_profile: `full`
- risk_signals: `generated-entry-drift`, `documentation-contract`
- autonomy_ceiling: `full_sdd_with_checkpoint`

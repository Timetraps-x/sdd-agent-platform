---
template: sdd-init-onboarding-tasks-v1
version: 1.3.0
contract: sdd-tasks-doc-v1
sdd_managed_starter: true
---

# Tasks: Project Onboarding

## Metadata

- spec_id: `onboarding`
- plan_id: `onboarding`
- branch: `master`
- created_at: `2026-05-07T07:14:44.122Z`
- updated_at: `2026-05-07T07:14:44.122Z`

## Task List

### ONBOARDING-1: Replace starter SDD documents with the first real task

```sdd-task
id: ONBOARDING-1
status: pending
wave: 1
depends_on: []
affected_files:
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
validation:
  - sdd status --branch master
risk: []
```

#### Boundary

Allowed scope is limited to replacing this starter onboarding scaffold with project-specific SDD requirements, plan, and tasks. Do not create worktrees, start background agents, commit changes, or apply sync-back automatically.

#### Acceptance

- `specs/master/spec.md` describes a real user request.
- `specs/master/plan.md` describes a concrete technical approach and validation strategy.
- `specs/master/tasks.md` contains executable task blocks for the real work.
- `sdd status --branch master` reports no blocking document or task parser gaps.

#### Implementation Notes

Created by `sdd init` as a safe onboarding placeholder. Replace before real implementation.

## Dependency Notes

- Single starter task only.
- The `wave: 1` field is present only because the current parser requires a positive wave value; it must not be interpreted as permission to run background agents or multi-wave orchestration.

## Phase Gate Checkpoint

- ready_for_implementation: `false`
- blockers:
  - Replace onboarding placeholders with real project requirements before implementation.
- required_user_decisions:
  - Confirm the first real feature/change request.

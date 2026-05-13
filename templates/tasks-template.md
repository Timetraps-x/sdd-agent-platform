---
template: sdd-tasks-template-v1
version: 1.4.0
contract: sdd-tasks-doc-v1
owner: platform-assets/templates
readers:
  - task parser
  - do command
  - reviewer
  - validator
  - future graph
---

# Tasks: <feature-or-change-name>

Template prose may be localized by project `docs_language`; `sdd-task`, YAML keys, task IDs, status values, artifact paths, commands, and parser-sensitive headings remain stable/English.

## 0. Metadata

- tasks_id: `<tasks-id>`
- spec_id: `<spec-id>`
- plan_id: `<plan-id>`
- branch: `<branch>`
- lifecycle_profile: `direct | compact | full | research`
- status: `draft | ready | in_progress | completed`
- created_at: `<ISO-8601>`
- updated_at: `<ISO-8601>`

## 1. Delivery Map

| Task | Spec Acceptance | Plan Section | Boundary Reason |
|---|---|---|---|
| T1 | AC-1 | §7 State / Data Design | isolate the smallest safe implementation boundary |

## 2. Wave Plan

| Wave | Tasks | Gate |
|---|---|---|
| 1 | T1 | review + validation artifact required when risk is high |

## 3. Task List

### T1: <task title>

```sdd-task
id: T1
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
plan_refs:
  - "§7 State / Data Design"
affected_files:
  - path/to/file
validation:
  - command string
risk: []
agent_fit:
  - scout
  - implementer
  - reviewer
  - validator
allowed_agents:
  - scout
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-T1.md
  - artifacts/review-T1.md
  - artifacts/validation-T1.md
verification_availability:
  - unit:<command>
  - build:<command>
autonomy: full_sdd_with_checkpoint
```

#### Boundary

Allowed implementation scope.

Forbidden scope:

- Do not change unrelated files or expand beyond the task boundary without a checkpoint.

#### Acceptance

- AC-1: task-specific acceptance mapping.

#### Definition of Done

- Boundary respected.
- Required artifacts created and validated when required by risk.
- Review artifact is PASS or PASS_WITH_GAPS with explicit gap handling.
- Validation artifact covers all acceptance refs.
- Validation commands pass or unavailable reason is explicit.
- `sdd verify task` produces PASS or PASS_WITH_GAPS with sync-back proposal.
- No untracked scope expansion.

#### Evidence Expectations

| Artifact | Expected Content |
|---|---|
| implement artifact | changed files, implementation notes, boundary evidence |
| review artifact | correctness, risk review, missed cases |
| validation artifact | command evidence, acceptance coverage |
| acceptance coverage | AC-by-AC verification result |

#### Implementation Notes

Reserved for approved sync-back notes and artifact links.

## 4. Dependency Notes

- Explain waves and dependencies when non-trivial.

## 5. Phase Gate Checkpoint

- ready_for_implementation: `true | false`
- blockers: []
- required_user_decisions: []

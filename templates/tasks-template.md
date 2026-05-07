---
template: sdd-tasks-template-v1
version: 1.3.0
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

## Metadata

- spec_id: `<spec-id>`
- plan_id: `<plan-id>`
- branch: `<branch>`
- created_at: `<ISO-8601>`
- updated_at: `<ISO-8601>`

## Task List

### T1: <task title>

```sdd-task
id: T1
status: pending
wave: 1
depends_on: []
affected_files:
  - path/to/file
validation:
  - command string
risk: []
```

#### Boundary

Allowed implementation scope. Explicitly list forbidden scope when relevant.

#### Acceptance

- AC-1 mapping or task-specific acceptance.

#### Implementation Notes

Reserved for approved sync-back notes and artifact links.

## Dependency Notes

- Explain waves and dependencies when non-trivial.

## Phase Gate Checkpoint

- ready_for_implementation: `true | false`
- blockers: []
- required_user_decisions: []

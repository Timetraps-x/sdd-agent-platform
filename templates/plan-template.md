---
template: sdd-plan-template-v1
version: 1.3.0
contract: sdd-plan-doc-v1
owner: platform-assets/templates
readers:
  - planner
  - implementer
  - reviewer
  - validator
  - future graph
---

# Plan: <feature-or-change-name>

## Metadata

- spec_id: `<spec-id>`
- plan_id: `<plan-id>`
- branch: `<branch>`
- lifecycle_profile: `compact | full | research`
- created_at: `<ISO-8601>`
- updated_at: `<ISO-8601>`

## Context

Summarize relevant architecture, code areas, and constraints.

## Technical Approach

Describe the chosen approach and why it is the shortest safe path.

## Impact Surface

| Area | Files / Modules | Confidence | Notes |
|---|---|---|---|
| `<area>` | `<paths>` | `high | medium | low` | `<notes>` |

## Contract / API / Data Impact

- Contract changes: `None | details`
- API changes: `None | details`
- Database/data changes: `None | details`
- State/concurrency changes: `None | details`

## Validation Strategy

| Acceptance | Validation Method | Command / Evidence |
|---|---|---|
| AC-1 | Manual/automated check | `<command or artifact>` |

## Risks and Mitigations

- Risk: mitigation.

## Gaps / Assumptions

- Gap or assumption.

## Phase Gate Checkpoint

- ready_for_tasks: `true | false`
- blockers: []
- required_user_decisions: []

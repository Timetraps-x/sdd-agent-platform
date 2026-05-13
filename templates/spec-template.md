---
template: sdd-spec-template-v1
version: 1.4.0
contract: sdd-spec-doc-v1
owner: platform-assets/templates
readers:
  - command gate
  - spec reviewer
  - planner
  - validator
  - future graph
---

# Spec: <feature-or-change-name>

Template prose may be localized by project `docs_language`; contract identifiers, metadata keys, IDs, commands, status values, and fenced block names remain stable/English.

## 0. Metadata

- spec_id: `<spec-id>`
- branch: `<branch>`
- lifecycle_profile: `direct | compact | full | research`
- source_request: `<short user request>`
- status: `draft | review | approved`
- created_at: `<ISO-8601>`
- updated_at: `<ISO-8601>`

## 1. Objective / Customer Value

- User value: `<what becomes better for the user>`
- Business value: `<optional business or operational value>`
- Engineering value: `<optional engineering outcome>`
- Observable success: `<what should be true when this is done>`

## 2. Problem / Intent

Describe the user intent, trigger, current pain, and why the change is needed now.

## 3. Users / Actors

| Actor | Need / Expectation | Current Pain |
|---|---|---|
| `<actor>` | `<need>` | `<pain>` |

## 4. User Stories / Scenarios

### Story US-1

As a `<actor>`, I want `<capability>`, so that `<benefit>`.

### Scenario S1: `<scenario name>`

- Given:
- When:
- Then:

## 5. Scope

### In Scope

- Item 1

### Out of Scope

- Item 1

## 6. Requirements

### Functional Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-1 | Requirement. | Must | user/request/spec |

### Non-functional Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| NFR-1 | Requirement. | Should | reliability/performance/security |

## 7. Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-1 | Verifiable acceptance criterion. | unit / integration / manual / inspect | Must |

## 8. Assumptions / Dependencies

| Item | Description | Impact if Wrong |
|---|---|---|
| `<assumption-or-dependency>` | `<description>` | `<impact>` |

## 9. Risks / Hard Gates

| Risk | Why it matters | Required Handling |
|---|---|---|
| `<risk-or-none>` | `<impact>` | `<gate or control>` |

## 10. Open Questions

| ID | Question | Owner | Required Before |
|---|---|---|---|
| Q-1 | Question. | `<owner>` | plan/tasks/do |

## 11. Lifecycle Decision Reference

- decision_artifact: `<state/event/artifact path or pending>`
- canonical_model: `docs/architecture/lifecycle-decision-model.md`
- recommended_profile: `direct | compact | full | research | pending`
- risk_signals: []
- autonomy_ceiling: `direct_execution_allowed | compact_boundary_only | full_sdd_with_checkpoint | research_before_implementation | pending`

# Phase 5.10 Spec

## Metadata

- phase_id: `5.10`
- artifact: `phases/phase-5.10-document-chain-verify-doctor.md`
- lifecycle_profile: `full`
- status: `planned`

## Objective / Customer Value

Turn the three semantic documents into an enforceable quality chain: requirement acceptance maps to plan design, tasks map to acceptance/design, and verify/doctor detect broken evidence links.

## Scope

### In Scope

- Use `acceptance_refs` in verify acceptance coverage where available.
- Add lightweight doctor checks for spec AC IDs, task refs, and high-risk artifact requirements.
- Run a clean ERP regression proving the chain remains safe for high-risk tasks.

### Out of Scope

- Full enterprise document linting.
- Replacing human review, release approval, or business validation.

## Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-5.10-1 | Verify can report coverage by referenced AC ID. | verify tests | Must |
| AC-5.10-2 | Doctor flags broken or missing high-risk document-chain evidence. | doctor tests | Must |
| AC-5.10-3 | ERP regression passes and manual gate cannot be bypassed by supplied artifacts. | regression report | Must |

## Risks / Hard Gates

- false-positive-doctor: checks must be useful without blocking low-risk lightweight usage.
- high-risk-bypass: supplied artifacts must not bypass manual isolation/approval gates.

## Lifecycle Decision Reference

- recommended_profile: `full`
- risk_signals: `regression`, `high-risk-case`
- autonomy_ceiling: `full_sdd_with_checkpoint`

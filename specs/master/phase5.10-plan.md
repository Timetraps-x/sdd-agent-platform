# Phase 5.10 Plan

## Metadata

- phase_id: `5.10`
- plan_id: `phase5.10-document-chain-verify-doctor-plan`
- depends_on: `5.9`
- blocks: `6.0`

## Implementation Slices

### P1: Verify acceptance refs

- Prefer task `acceptance_refs` when computing coverage labels.
- Preserve fallback to task acceptance text for old tasks.

### P2: Doctor semantic chain checks

- Check spec AC IDs and task acceptance_refs resolution.
- Check high-risk tasks for required artifacts and reviewer/validator evidence expectations.
- Keep warnings/failures scoped and explain next actions.

### P3: ERP regression

- Create fresh temp ERP inbound-sync project with AC IDs and task refs.
- Run init/status/tasks inspect/do/verify/doctor.
- Record report in Phase 5.10 validation.

## Validation Strategy

- `npm test`
- `npm run build`
- Fresh ERP high-risk regression.

## Risks

- Doctor must avoid turning lightweight low-risk tasks into heavyweight bureaucracy.

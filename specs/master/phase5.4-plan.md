# Phase 5.4 Plan

## Metadata

- phase_id: `5.4`
- plan_id: `phase5.4-managed-assets-query-status-harness-plan`
- depends_on: `5.3`
- blocks: `5.5`

## Implementation Slices

### P1: Managed asset manifest

- Add source contract and ownership metadata.
- Record hash/version/tool/path/drift status.
- Keep generated entry as projection, not source of truth.

### P2: Doctor drift classification

- current / drifted / user-modified / foreign.
- update only fixes managed drift by default.

### P3: QueryStatusContract

- `status = next action`.
- `doctor = health audit`.
- `run inspect = run evidence`.
- debug = drill-down.

## Validation Strategy

- `npm test`
- `npm run build`
- `sdd status --branch master`
- `sdd doctor`
- generated entry drift smoke

## Risks

- Update must not overwrite user-modified files.
- Status output must stay concise.

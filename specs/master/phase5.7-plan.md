# Phase 5.7 Plan

## Metadata

- phase_id: `5.7`
- plan_id: `phase5.7-hardening-regression-gate-plan`
- depends_on: `5.6`
- blocks: `6.0`

## Implementation Slices

### P1: Regression gate documentation

- Add Phase 5.7 phase artifact and short spec/plan/tasks/validation documents.
- Insert Phase 5.7 before Phase 6 in phase status and phase artifact index.

### P2: Agent participation narrative

- Update generated Claude Code command wording so agent participation is visible as an evidence flow: scout -> implementer -> reviewer -> validator -> verify/sync-back.
- Update dynamic instructions for `do`, `verify`, and overview paths with run-relative vs physical artifact path wording.

### P3: External demo narrative

- Add README section comparing ordinary agent direct execution with SDD Harness on high-risk ERP inbound-sync case.
- Emphasize lifecycle risk gate, task graph/wave gates, manual approval, artifact evidence, acceptance verification, sync-back, and doctor.

### P4: Clean ERP regression rerun

- Run a fresh temp ERP inbound-sync full-chain regression using the built CLI.
- Verify the three fixed A/B defects and that high-risk gating remains intact.
- Record validation evidence in `phase5.7-validation.md`.

## Validation Strategy

- `npm test`
- `npm run build`
- Fresh ERP inbound-sync regression with `init`, `lifecycle decide`, `status`, `tasks inspect`, `graph inspect`, `wave inspect`, `do task`, `artifact validate`, `verify task`, `run inspect`, and `doctor`.

## Risks

- README/demo wording must explain platform differentiation without claiming it replaces Claude Code or generic agent coding ability.
- Agent participation must remain a harness evidence model, not a false claim that the CLI autonomously launches external agents.

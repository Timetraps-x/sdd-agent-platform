# Phase 8 Risk Consumer Review

## Scope

PHASE8-4 integrates lifecycle risk decisions into command consumers as observe/compare diagnostics. The integration covers status, doctor, sync-back, and ship without making the Phase 8 lifecycle risk decision the sole readiness gate.

## Consumer behavior

- `status` reports `lifecycle_risk` with status, profile, approval policy, stored input hash, and expected input hash.
- `doctor` reports `lifecycle_risk_decision` as a visible PASS-level observe/compare diagnostic so missing or stale projections do not change legacy doctor status aggregation.
- `sync-back inspect` carries lifecycle risk diagnostics both on the inspection result and approval card.
- `ship --dry-run` includes a `lifecycle_risk_decision` check and health summary, but the check is always diagnostic PASS during observe/compare.

## Safety boundary

- Missing, stale, blocked, and incompatible lifecycle risk projections are surfaced as diagnostics.
- Legacy readiness behavior remains available and authoritative for this task.
- Ship readiness is still blocked by existing document, doctor, run evidence, token, or workflow checks, not by missing lifecycle risk projections.
- Sync-back readiness remains driven by existing run/proposal/verify/apply-policy blockers.

## Boundary confirmation

- No agent, team, subagent, owner, or routing fields were added to lifecycle risk decisions.
- No new Runtime Store schema was introduced.
- No command was changed to enforce lifecycle risk decisions as the only gate.

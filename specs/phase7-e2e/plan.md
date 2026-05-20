# Plan — Phase 7 E2E Workflow Validation

## Approach

Run a validation-only task through the current SDD lifecycle using the explicit `phase7-e2e` partition. The implementation artifact will record observed command evidence rather than changing source behavior.

## Steps

1. Confirm explicit branch status for `phase7-e2e`.
2. Create task contract and verify contract for `PHASE7E2E-1`.
3. Route the task and inspect deterministic runtime decisions.
4. Create a real run and attach implementation, review, and validation artifacts.
5. Execute at least one local command via `sdd test task`.
6. Verify task acceptance coverage.
7. Inspect sync-back approval card.
8. Apply sync-back if the case is low-risk and approved by policy.
9. Validate statusline, doctor fast, and ship dry-run readiness.

## Validation commands

- `npm run sdd -- status --branch phase7-e2e`
- `npm run sdd -- tasks route PHASE7E2E-1 --branch phase7-e2e`
- `npm run sdd -- verifies write --branch phase7-e2e --force`
- `npm run sdd -- run create --branch phase7-e2e --task PHASE7E2E-1`
- `npm run sdd -- test task PHASE7E2E-1 --branch phase7-e2e --command "node --version"`
- `npm run sdd -- verify task PHASE7E2E-1 --branch phase7-e2e`
- `npm run sdd -- sync-back inspect --task PHASE7E2E-1 --branch phase7-e2e`
- `npm run sdd -- statusline --branch phase7-e2e`
- `npm run sdd -- doctor fast --branch phase7-e2e`
- `npm run sdd -- ship --branch phase7-e2e --dry-run`

## Boundaries

- No remote operations.
- No source behavior changes.
- No publish/deploy/tag/push.

# Validation: Context Budget Runtime and Non-authoritative Log Workers

## 1. Validation Goals

Phase 6.10 validation proves that runtime context/token reduction is real while workflow authority and evidence trust remain unchanged.

## 2. Required Checks

- `npm run typecheck`
- focused tests for context budget, evidence summary, context build, log worker boundaries, and trust regression
- `npm test`
- `npm run build`
- built CLI smoke:
  - `node ./dist/packages/cli/src/main.js context build --task PHASE6.10-8 --branch master --mode verify --json`
  - `node ./dist/packages/cli/src/main.js context build --task PHASE6.10-8 --branch master --mode doctor --agent validator`
  - `node ./dist/packages/cli/src/main.js evidence summary <run_id> --task PHASE6.10-8 --json`
  - `node ./dist/packages/cli/src/main.js doctor --latest-only --branch master`
  - `node ./dist/packages/cli/src/main.js status --branch master --compact-json`
- `npm pack --dry-run --json`
- tarball install smoke before completion.

## 3. Budget Assertions

| Surface | Default Budget | Forensic Behavior |
|---|---:|---|
| status brief | <= 2 KB text | full JSON/compact JSON remains available |
| doctor latest brief | <= 4 KB text | forensic lists all findings/source refs |
| sync-back inspect brief | <= 3 KB text | proposal content available by explicit include/forensic |
| evidence summary | <= 6 KB per task | full artifacts remain source paths |
| context build verify | <= 8 KB text | required/optional/deferred refs preserve expansion path |

## 4. Trust Regression Assertions

- A `CommandOutputSummary` cannot satisfy `sdd-evidence-v1` PASS source evidence.
- An `EvidenceSummaryProjection` cannot satisfy acceptance coverage PASS.
- A `ContextBuildPackage` cannot be used as a source artifact for PASS.
- A `LogWorkerSummary` cannot change verify, doctor, route, or sync-back readiness.
- Phase 6.9 mention-only/TODO/derived-output regressions remain blocked.

## 5. Installed CLI Proof

Completion requires a real installed CLI chain from the current tarball:

1. build
2. pack
3. global install from tarball
4. `sdd --version`
5. `sdd status --branch master --compact-json`
6. `sdd context build ...`
7. `sdd tasks inspect PHASE6.10-8 --branch master --json`
8. `sdd tasks route PHASE6.10-8 --branch master --json`
9. `sdd doctor --latest-only --branch master`

Do not apply sync-back without explicit approval.

## 6. Completion Evidence

Phase 6.10 is completed.

- Task closeout: PHASE6.10-1 through PHASE6.10-8 are marked completed in `phase6.10-tasks.md` and active `tasks.md`.
- Workflow runs: `20260512-008` through `20260512-016` produced policy-backed verify PASS evidence and sync-back was applied for all Phase 6.10 tasks.
- Implemented contracts: context profiles, context package contracts, evidence summary projection, command output summary, and non-authoritative log worker boundary.
- Trust boundary: command/evidence/context/log summaries are derived projections and remain `authoritative=false` / unusable for PASS evidence.
- Validation gates: context-focused tests, full `npm run typecheck`, `npm test`, `npm run build`, `npm pack --dry-run --json`, tarball install smoke, installed `sdd` status/context/tasks/route/doctor smokes, and doctor latest-only PASS are recorded as completed in `phases/PHASE_STATUS.md`.
- Completion index: `phases/PHASE_STATUS.md` marks Phase 6.10 completed and opens Phase 7.0.
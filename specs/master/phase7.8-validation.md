# Phase 7.8 Validation — Sync-back, Ship and Observability

## Summary

Phase 7.8 is validated as PASS for current-run release readiness and local observability surfaces.

Implemented and validated:

- `sdd sync-back inspect` exposes `sdd-sync-back-approval-card-v1` in JSON and text output.
- `sdd ship --branch <branch>` writes `specs/<branch>/release.md` and reports `sdd-ship-readiness-v1` readiness.
- `sdd ship --dry-run` reports readiness without writing release docs.
- `sdd statusline`, `sdd progress`, and `sdd status --statusline` expose compact runtime/test/team/token/evidence health.
- `sdd doctor fast`, `sdd doctor deep`, and `sdd doctor recover` expose explicit diagnostic scope and deterministic recover guidance.
- Help, dynamic instructions, and generated Claude Code entries expose ship/statusline/doctor fast-deep-recover semantics without claiming publish/deploy behavior.

## Gates

| Gate | Result | Evidence |
|---|---:|---|
| `npm run build` | PASS | TypeScript build completed after Phase 7.8 changes. |
| Focused sync-back tests | PASS | `node --test --import tsx packages/core/src/sync-back/sync-back.test.ts`: 7/7 pass. |
| Focused CLI regression tests | PASS | `node --test --import tsx packages/cli/src/commands/cli-regression.test.ts`: 35/35 pass. |
| Combined focused Phase 7.8 tests | PASS | Focused sync-back + CLI regression: 42/42 pass. |
| Affected contract tests | PASS | `instructions.test.ts`, `init-project.test.ts`, and `project-status.test.ts`: 17/17 pass. |
| `npm run typecheck` | PASS | Build + `tsc --noEmit` completed. |
| `npm test` | PASS | 187/187 pass, 0 fail. |
| `npm pack --dry-run --json` | PASS | Produced `sdd-agent-platform-0.3.0.tgz`; package dry-run ran build during prepare. |
| `npm run sdd -- update` | PASS | Refreshed managed `/sdd:doctor` and `/sdd:ship` Claude Code entries after template updates. |
| `npm run sdd -- ship --branch master --dry-run` | PASS | Reported `SDD ship PASS for master`; `wrote=false`; latest doctor 45/45 PASS. |
| `npm run sdd -- ship --branch master` | PASS | Wrote `specs/master/release.md`; reported `wrote=true`. |
| `npm run sdd -- statusline --branch master` | PASS | Rendered compact projection: tasks complete, runtime pass, test pass, evidence pass. |
| `npm run sdd -- doctor fast --branch master` | PASS | Latest-only doctor: 45 pass, 0 warn, 0 fail. |
| `npm run sdd -- doctor recover --branch master` | PASS | Latest-only doctor: 45 pass, 0 warn, 0 fail; recover next actions rendered. |
| `npm run sdd -- doctor --latest-only --branch master` | PASS | Latest-only doctor: 45 pass, 0 warn, 0 fail. |
| `npm run sdd -- doctor deep --branch master` | DIAGNOSTIC | Deep all-runs audit intentionally surfaced historical Phase 6.x evidence debt; this is not a current-run release blocker. |

## Deep doctor note

`doctor deep` is an explicit historical audit and returned existing all-runs debt such as legacy acceptance-trust, artifact-ingestion, and route-consistency findings from prior Phase 6.x runs. Phase 7.8 keeps this visible while preserving fast/latest as the default readiness path. Current-run checks remain clean via `doctor fast`, `doctor recover`, and `doctor --latest-only`.

## Fixes during validation

- Generated AI entries for `/sdd:doctor` and `/sdd:ship` were refreshed with `sdd update` after doctor/ship instruction template changes.
- `sdd doctor recover` initially scanned historical runs because it did not force latest-only scope. The command now uses latest-only scope unless `deep` or `--all-runs` is explicitly selected.

## Acceptance coverage

- AC-1: PASS — sync-back approval card contract and renderer are covered by sync-back tests and compact JSON CLI regression.
- AC-2: PASS — `sdd ship --branch master` wrote `specs/master/release.md`.
- AC-3: PASS — `sdd ship --branch master --dry-run` reported readiness with `wrote=false`.
- AC-4: PASS — help, dynamic instructions, and generated entries expose ship/statusline/doctor semantics and retain the no-publish/no-deploy boundary.
- AC-5: PASS — statusline/progress projection exposes runtime/test/team/token/evidence health.
- AC-6: PASS — doctor fast/deep aliases and recover guidance are visible; default/current readiness remains latest-only.
- AC-7: PASS — build, typecheck, full tests, pack dry-run, release/statusline/doctor smokes, and latest doctor pass.

## Result

Phase 7.8 is ready to close. Phase 8.0 can consume the finalized sync-back, ship, statusline, doctor, and release-readiness surfaces.

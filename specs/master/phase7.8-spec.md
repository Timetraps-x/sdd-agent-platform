# Phase 7.8 Spec — Sync-back, Ship and Observability

## Goal

Close Phase 7 by adding review, release-readiness, and observability surfaces that make runtime/test/team/evidence health visible without changing the underlying workflow decision boundaries.

## In scope

- Add a sync-back approval card contract to `sdd sync-back inspect` JSON/text output.
- Add `sdd ship` as a readiness and release document command.
- Generate or update `specs/<branch>/release.md` from current branch status, tasks, verify/test/team/runtime health, and ship readiness checks.
- Add a compact statusline/progress projection for local CLI/statusline consumers.
- Make doctor fast/deep intent explicit while preserving existing `--latest-only` and `--all-runs` behavior.
- Add recover/reconcile guidance as deterministic next-action output.
- Keep outputs compact, local-first, and replay-safe.

## Out of scope

- Do not deploy, publish, push, tag, or mutate remote/shared state.
- Do not store release summary under `.sdd/runs`.
- Do not make statusline a persistent audit log.
- Do not make doctor default to deep historical scan.
- Do not let subagent recommendations approve sync-back or release state.

## Acceptance criteria

- AC-1: `sdd sync-back inspect` renders a compact approval card and JSON includes a stable card object.
- AC-2: `sdd ship --branch <branch>` writes `specs/<branch>/release.md` and reports PASS/BLOCKED readiness.
- AC-3: `sdd ship --dry-run` reports readiness without writing release docs.
- AC-4: CLI help and generated instructions expose the ship/statusline/doctor fast-deep surfaces consistently.
- AC-5: Statusline/progress output exposes compact runtime/test/team/token/evidence health signals.
- AC-6: Doctor fast/deep aliases and recover guidance are visible without deep scan by default.
- AC-7: Build, typecheck, focused tests, full tests, pack dry-run, ship/statusline/sync-back/doctor smokes, and latest doctor pass.

## Public contracts

- Sync-back approval card contract: compact scope, status, risk, proposal digest, approval requirement, blockers, stale reasons, affected-file conflicts, and next action.
- Release document path: `specs/<branch>/release.md`.
- Ship CLI:
  - `sdd ship [--branch <branch>] [--dry-run] [--json]`
- Statusline/progress CLI:
  - compact local projection suitable for Claude Code statusline scripts and AI/tool consumers.
- Doctor CLI:
  - preserve `sdd doctor --latest-only` and `sdd doctor --all-runs`;
  - add explicit fast/deep naming if implementation can do so without breaking existing behavior.

## Expected behavior

- Ship returns PASS only when latest doctor/status/readiness checks are clean enough for release summary generation.
- BLOCKED ship output lists concrete next actions rather than attempting automatic repair.
- Approval card and release doc reference existing runtime evidence and semantic docs rather than duplicating full artifacts.
- Recover guidance recommends rebuild/reinspect/archive/rerun/approval actions but does not execute destructive changes.

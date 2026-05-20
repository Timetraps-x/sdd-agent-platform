# Phase 7.8 Tasks — Sync-back, Ship and Observability

## Task list

| Task | Status | Acceptance refs | Notes |
|---|---|---|---|
| PHASE7.8-1 | completed | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6 | Created Phase 7.8 research/spec/plan/tasks docs and marked the phase active. |
| PHASE7.8-2 | completed | AC-1 | Added sync-back approval card contract, JSON payload, text renderer, and focused coverage. |
| PHASE7.8-3 | completed | AC-2, AC-3, AC-4 | Added `sdd ship`, dry-run readiness, and branch-scoped `release.md` generation. |
| PHASE7.8-4 | completed | AC-5, AC-6 | Added compact statusline/progress projection and doctor fast/deep/recover guidance surfaces. |
| PHASE7.8-5 | completed | AC-7 | Validated gates, wrote validation evidence, updated phase status, and closed Phase 7.8. |

## Acceptance criteria

- AC-1: `sdd sync-back inspect` renders and serializes a compact approval card.
- AC-2: `sdd ship --branch <branch>` writes `specs/<branch>/release.md`.
- AC-3: `sdd ship --dry-run` reports readiness without writing release docs.
- AC-4: Help/instructions/generated entries expose ship semantics without claiming deploy/publish behavior.
- AC-5: Statusline/progress output exposes compact runtime/test/team/token/evidence health signals.
- AC-6: Doctor fast/deep aliases and recover guidance are visible without default deep scans.
- AC-7: Validation gates pass and latest doctor remains clean.

## Evidence links

- [phase7.8-validation.md](phase7.8-validation.md) — build/typecheck/full-test/pack and SDD ship/statusline/doctor smokes completed; latest doctor clean.

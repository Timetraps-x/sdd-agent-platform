# Phase 2.6 Doctor Drift Check 与 Update Check 模式 Validation

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.6-doctor-drift-check.md` 的验证记录。

## 1. 验证清单

| Check | Expected | Result | Evidence |
|---|---|---|---|
| Doctor mapping | AI entry statuses map to DoctorCheck | pass | `inspectAiToolEntryEvidence` maps unchanged PASS, missing/drifted/foreign/conflict FAIL. |
| Drift test | Modified managed command makes doctor fail | pass | `doctor reports AI entry drift after init` test passed. |
| Clean E2E | After update repair, doctor AI entries pass | pass | Temp tarball E2E doctor output shows all `ai_entry_*` checks PASS after repair. |
| Real read-only smoke | Real repo missing entries are reported | pass | `D:\project\inshn-etalk-web` doctor reports missing AI entries as FAIL; no write update was run. |
| Full suite | Existing doctor/run evidence behavior unchanged | pass | `npm test` passed: 35 tests, 35 pass. |

## 2. 验收结论

```yaml
phase: phase-2.6-doctor-drift-check
status: completed
validation_method: tests-temp-e2e-real-readonly-smoke
completion_evidence:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
next_gate: phase-2.7-entry-projection-e2e completed in same implementation sequence
open_gaps: []
```

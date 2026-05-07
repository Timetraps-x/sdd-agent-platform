# Phase 2.5 Detector Registry 与 Mixed Stack 识别 Validation

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.5-detector-registry.md` 的验证记录。

## 1. 验证清单

| Check | Expected | Result | Evidence |
|---|---|---|---|
| Detector model | confidence/evidence/candidate types exist | pass | `packages/core/src/index.ts` defines `DetectionEvidence`, `ProjectDetectionCandidate`, `ProjectDetection`. |
| Java Maven | Maven multi-module classified as Java SSM Maven | pass | `initProject detects Maven multi-module Java projects` test passed. |
| Mixed stack | Java business repo with package.json remains Java primary | pass | `initProject classifies mixed Java and Node repos by source evidence` test passed. |
| Detection metadata | config includes primary/confidence/mixed candidates | pass | tests assert `detection.primary`, `detection.confidence`, `mixed_stack`, and TypeScript candidate. |
| Backward compatibility | detection section optional in parser | pass | existing config tests still pass under `npm test`. |

## 2. 验收结论

```yaml
phase: phase-2.5-detector-registry
status: completed
validation_method: typecheck-tests
completion_evidence:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
next_gate: phase-2.6-doctor-drift-check completed in same implementation sequence
open_gaps: []
```

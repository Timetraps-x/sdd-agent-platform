# Phase 2.4 Instruction API 与薄入口改造 Validation

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.4-instruction-api-thin-entries.md` 的验证记录。

## 1. 验证清单

| Check | Expected | Result | Evidence |
|---|---|---|---|
| Contract | Instruction payload uses `sdd-instructions-v1` | pass | `instructions API returns stable JSON contract payloads` test passed. |
| CLI JSON | `instructions --json` returns overview JSON | pass | dist CLI smoke printed `contract: sdd-instructions-v1`, `action: overview`. |
| Thin entries | generated entries reference instruction API | pass | init projection test matched `sdd instructions overview --json`. |
| Side-effect boundaries | payload includes forbidden side effects | pass | doctor payload test asserts `background write` is forbidden. |

## 2. 验收结论

```yaml
phase: phase-2.4-instruction-api-thin-entries
status: completed
validation_method: tests-dist-cli-smoke
completion_evidence:
  - packages/core/src/instructions.ts
  - packages/core/src/ai-tools.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
next_gate: phase-2.5-detector-registry completed in same implementation sequence
open_gaps: []
```

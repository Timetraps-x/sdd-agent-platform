# Phase 2.6 Doctor Drift Check 与 Update Check 模式 Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.6-doctor-drift-check.md` 的执行 plan。

## 1. 实施步骤

1. 在 doctor config 存在路径后追加 AI entry checks。
2. 实现 `inspectAiToolEntryEvidence`。
3. 将 `AiEntryStatusReport` 映射为 `DoctorCheck`。
4. 保持 doctor 只读行为。
5. 通过 unit test 验证 drift -> FAIL。
6. 通过 temp E2E 验证 update 修复后 doctor AI checks PASS。
7. 在真实目标仓库只读执行 doctor，确认 missing entries 能报告。

## 2. 修改文件

- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`

## 3. 验证命令

```bash
npm run typecheck
npm test
node ./dist/packages/cli/src/main.js doctor
```

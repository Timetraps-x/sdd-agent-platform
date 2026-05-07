# Phase 2.5 Detector Registry 与 Mixed Stack 识别 Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.5-detector-registry.md` 的执行 plan。

## 1. 实施步骤

1. 定义 `DetectionConfidence`、`DetectionEvidence`、`ProjectDetectionCandidate`、`ProjectDetection`。
2. 定义 `ProjectDetector` registry。
3. 将 Java/Maven/SSM evidence 迁移为 `java-ssm-maven-multimodule` detector。
4. 将 Node/TypeScript evidence 迁移为 `typescript-node` detector。
5. `detectProjectConfig` 选择 score 最高 candidate 作为 primary。
6. 当多个 candidate 有正分时输出 `mixed_stack: true`。
7. `renderProjectConfig` 写入 detection section，`parseProjectConfig` 容忍 optional detection。
8. 更新现有 Maven/mixed repo tests。

## 2. 修改文件

- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`

## 3. 验证命令

```bash
npm run typecheck
npm test
```

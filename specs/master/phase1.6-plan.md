# Phase 1.6 Plan — Artifact / Delegation Contract

## 1. 实施策略

以 `packages/core` 为 artifact/delegation contract 的事实源，`packages/cli` 仅提供只读 artifact validation 入口。

实现顺序：

1. 在 core 中定义 `SddResult`、`DelegationRecord`、contract validation report 类型。
2. 实现 artifact path scope helper：artifact-root-relative 与 run-relative 的转换和防逃逸校验。
3. 实现安全 artifact write/read helper。
4. 实现 `sdd-result` fenced block parser / validator。
5. 实现 delegation terminal/stale/expected artifact contract checks。
6. 在 CLI 增加只读 `sdd artifact validate`。
7. 增加 sdd-result、artifact path、delegation stale/terminal 测试。
8. 更新 retained docs、README、top-level indexes、PHASE_STATUS。

## 2. 设计约束

- `sdd-result.artifacts` 与 delegation `expectedArtifact` 使用 run-relative path：`artifacts/<file>`。
- Artifact helper 输入使用 artifact-root-relative path：`review-T1.md`，不能传入 `artifacts/review-T1.md`。
- 所有 artifact helper 必须限制在当前 run 的 `artifacts` 目录内。
- `RUNNING` 不可被视为 terminal；超出 timeout 的 RUNNING 返回 stale issue。
- `COMPLETED` 仅表示 delegation 结束，仍必须校验 expected artifact contract。
- CLI 只做 contract validation，不做 command integration、task execution 或 lifecycle gate。

## 3. API / CLI

Core API：

- `parseSddResultMarkdown(raw)`
- `validateSddResult(result, options)`
- `validateSddResultArtifact(projectRoot, runId, artifactPath, options)`
- `writeArtifact(projectRoot, runId, artifactRootRelativePath, content)`
- `readArtifact(projectRoot, runId, artifactRootRelativePath)`
- `getRunRelativeArtifactPath(artifactRootRelativePath)`
- `toArtifactRootRelativePath(runRelativeArtifactPath)`
- `createDelegationRecord(input)`
- `isDelegationTerminal(status)`
- `isDelegationStale(delegation, now)`
- `validateDelegationRecord(projectRoot, runId, delegation, now)`

CLI：

- `sdd artifact validate <run_id> <artifacts/path.md> [--task <task_id>] [--agent <agent>]`

## 4. 验证计划

本阶段修改 TypeScript runtime / CLI，因此运行：

- `npm run typecheck`
- `npm test`
- `npm run build`

同时执行 smoke：

- `node dist/packages/cli/src/main.js tasks gaps --branch master`
- `node dist/packages/cli/src/main.js artifact validate <run_id> artifacts/<file> --task P1.6-SMOKE --agent reviewer`

# Phase 1.2 Runtime 骨架 Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-1.2-runtime-skeleton.md` 的执行 plan。

## 1. 执行原则

```text
Phase 1.1 architecture baseline
  -> minimal TypeScript core contracts
  -> thin CLI commands
  -> file runtime smoke evidence
  -> typecheck/tests
  -> validation evidence
  -> phase status update
```

关键约束：

- 只落地 Phase 1.2 runtime spine。
- lifecycle decision 只记录 contract shape，不执行 routing algorithm。
- schemas 只覆盖 Phase 1.2 必需 project/run/event/artifact/lifecycle contract，不提前实现 Phase 1.3 pack。
- doctor 只检查基础环境，不做 liveness/artifact/delegation 深度验证。
- 不自动 commit。

## 2. 输入文档

- `context/memory/MEMORY.md`
- `docs/research/自建_SDD_subagent_工作流平台方案.md`
- `docs/architecture/lifecycle-decision-model.md`
- `docs/architecture/sdd-agent-platform-architecture.md`
- `specs/master/phases/phase-1.2-runtime-skeleton.md`
- `specs/master/phases/README.md`
- `specs/master/phases/PHASE_STATUS.md`

## 3. 实现策略

### 3.1 Core package

新增 `packages/core/src/index.ts`，集中实现 Phase 1.2 最小能力：

1. contract constants。
2. project config writer/reader。
3. run id、run dir、state/event/artifact path helpers。
4. run creation and state read/write。
5. append-only event writer。
6. lifecycle decision placeholder record。
7. doctor checks and report renderer。

### 3.2 CLI package

新增 `packages/cli/src/main.ts`：

- `sdd init [--force]`
- `sdd doctor`
- `sdd run create`
- `sdd run status <run_id>`

CLI 调用 core，不复制 runtime contract。

### 3.3 Contracts

新增 Phase 1.2 contract docs：

- `schemas/phase-1.2-project-contract.md`
- `schemas/phase-1.2-run-state-contract.md`
- `schemas/phase-1.2-event-log-contract.md`
- `schemas/phase-1.2-artifact-path-contract.md`
- `schemas/phase-1.2-lifecycle-decision-contract.md`

### 3.4 Validation

最小验证命令：

1. `npm install`
2. `npm run typecheck`
3. `npm test`
4. `npm run sdd -- init`
5. `npm run sdd -- doctor`
6. `npm run sdd -- run create`
7. `npm run sdd -- run status 20260501-001`

## 4. 更新策略

- 更新 package scripts：保留 `typecheck`，增加 `test` 的 TS runner 和 `sdd` script。
- 更新 tsconfig：补齐 Node types 和 TS import 配置。
- 更新 README 与 `specs/master/{spec,plan,tasks,validation}.md` 索引，加入 Phase 1.2。
- 在 validation evidence 写入后更新 `PHASE_STATUS.md`。

## 5. 风险处理

### 过度实现 command gate

只保留 lifecycle decision record 字段和事件，不在 core 或 CLI 中实现 hard gate evaluation。

### YAML parser scope creep

Phase 1.2 使用轻量 config writer/reader 和 required section 检查；完整 adapter/schema validation 留给 Phase 1.3+。

### Runtime 写入越界

runtime 写入限定在 `.sdd/`、`packages/`、`schemas/`、phase docs 和 package config 内；run artifacts 保持在 `.sdd/runs/<run_id>/artifacts/` 下。

### Doctor 过深

Phase 1.2 doctor 只检查 git repo、project config、runs dir、specs dir。stale delegation、artifact invalid、goal-level validation 加固留给 Phase 1.6/1.9。

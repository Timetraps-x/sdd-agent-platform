# Phase 1.2 Runtime 骨架 Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-1.2-runtime-skeleton.md` 的执行 spec。

Phase 1.2 只实现最小 TypeScript / Node runtime spine，不进入 Phase 1.3+ 的 template/adapter pack、parser、agent delegation、artifact validator、command gate 或 workflow loop。

## 1. 背景

Phase 1.1 已冻结架构基线：Markdown 是 SDD 语义事实源，`.sdd/runs` 是 runtime 执行事实源，TypeScript core 承载可测试事实逻辑，CLI 只做薄命令入口。Phase 1.2 的目标是把这些边界落成最小可运行骨架。

## 2. 目标

完成后平台必须能够：

- 初始化或读取 `.sdd/project.yml`。
- 创建 `.sdd/runs/<run_id>/`。
- 写入 `state.json`。
- 追加写入 `events.jsonl`。
- 创建并解析 artifacts 目录路径。
- 提供最小 `doctor`，输出 PASS / WARN / FAIL 和可操作原因。
- 提供 TypeScript CLI 最小入口：`sdd init`、`sdd doctor`、`sdd run create`、`sdd run status`。
- 在 state/events 中预留 lifecycle decision record 字段和事件，但不执行 Phase 1.7 command gate。

## 3. 范围

### 3.1 包含

- `packages/core`：project config、run state、event log、artifact path、doctor、lifecycle decision placeholder contract。
- `packages/cli`：最小 CLI command dispatch。
- `.sdd/project.yml`：当前仓库的项目配置实例。
- `.sdd/runs/<run_id>/state.json` 与 `events.jsonl`：CLI smoke evidence。
- `schemas/phase-1.2-*.md`：Phase 1.2 运行时 contract 说明。
- `package.json`、`package-lock.json`、`tsconfig.json`：仅补齐 TypeScript runtime/test 所需脚本和依赖。
- Phase 1.2 execution docs 与必要索引。

### 3.2 不包含

- 不实现 lifecycle decision algorithm、hard gate evaluation 或 user checkpoint UX。
- 不解析 `spec.md / plan.md / tasks.md` 或 `sdd-task` block。
- 不实现 artifact validator 或 `sdd-result` 解析。
- 不实现 delegation lifecycle、heartbeat、timeout auto-recovery 或 background agent 调度。
- 不生成 sync-back proposal。
- 不引入 plugin loader、tool registry、worktree、并发、dashboard、run DB。
- 不实现 Phase 1.3+ schema/template/adapter pack，只提供 Phase 1.2 必需 contract 占位文档。

## 4. 功能需求

### FR-1 Project config

- `sdd init` 必须创建 `.sdd/project.yml` 和 `.sdd/runs`。
- 重复执行 `sdd init` 不应覆盖已有 project config，除非传入 `--force`。
- project config 必须包含 contract id、project、sdd、validation、editing、runtime、lifecycle sections。

### FR-2 Run state and events

- `sdd run create` 必须创建唯一 run id。
- 每个 run 必须包含 `state.json`、`events.jsonl`、`artifacts/`。
- `state.json` 必须包含 contract id、runtime version、run status、paths、lifecycle decision placeholder、tasks/agents/delegations/artifacts/validation/syncBack slots。
- `events.jsonl` 必须 append-only 写入 `run_started` 和 `lifecycle_decision_recorded`。

### FR-3 Artifact paths

- core 必须提供 artifacts root 和 artifact path resolver。
- artifact path resolver 必须阻止 `../` 逃逸 artifacts directory。

### FR-4 Doctor

- `sdd doctor` 必须检查 git repo、project config、runs dir、specs dir。
- 输出必须包含整体 PASS / WARN / FAIL 和逐项原因。
- doctor 只诊断，不 auto-fix。

### FR-5 CLI

- CLI 支持 `init`、`doctor`、`run create`、`run status <run_id>`。
- CLI 只做参数分发和输出，不承载领域状态机。

## 5. 验收标准

- `npm run typecheck` 通过。
- `npm test` 通过，覆盖 init、run state/events、artifact path escape、doctor 基础行为。
- `npm run sdd -- init` 能生成或校验 `.sdd/project.yml`。
- `npm run sdd -- doctor` 在当前仓库输出 PASS。
- `npm run sdd -- run create` 能创建唯一 run，并写入 `state.json` 与 `events.jsonl`。
- `npm run sdd -- run status <run_id>` 能读取 run 快照。
- Phase 1.2 不实现 Phase 1.3+ 非目标能力。
- `phase1.2-validation.md` 写入验证证据后，才允许更新 `PHASE_STATUS.md` 为 completed。

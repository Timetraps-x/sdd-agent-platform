# Phase 1.2 Runtime 骨架

## 1. 定位

Phase 1.2 在 Phase 1.1 架构基线完成后执行，用 TypeScript / Node.js 建立最小 runtime spine。

本阶段只建立可恢复、可审计、可校验的执行事实源，不进入 parser、agent、workflow、artifact validator 或 command gate 实现。

## 2. 依赖

```yaml
depends_on:
  - phase-1.1-architecture-baseline
blocks:
  - phase-1.3-contract-templates-adapters
  - phase-1.5-sdd-parser-task-model
  - phase-1.6-artifact-delegation-contract
  - phase-1.7-claude-code-command-integration
  - phase-1.8-single-task-loop
  - phase-1.10-real-project-trial
```

## 3. 范围

- 初始化和读取 `.sdd/project.yml`。
- 创建 `.sdd/runs/<run_id>/`。
- 写入和读取 `state.json`。
- 追加写入 `events.jsonl`。
- 约定 artifacts 目录结构和路径解析。
- 提供最小 doctor，检查 git repo、项目配置、runs 目录、spec 目录可用性。
- 提供 TypeScript CLI 的最小命令入口。
- 在 state/events 中预留 lifecycle decision 记录字段和事件。

## 4. 非目标

- 不实现 lifecycle decision 的完整模型或算法，只预留记录字段、event 和 contract。
- 不解析完整 `spec.md / plan.md / tasks.md`。
- 不解析 `sdd-task` block。
- 不自动调度 Claude Code subagent。
- 不实现 reviewer / validator / debugger 闭环。
- 不生成 sync-back proposal。
- 不做 worktree、并发、插件或工具注册。

## 5. 交付物

- `packages/core`：project config、run state、event log、artifact path、doctor 基础能力。
- `packages/cli`：`sdd init`、`sdd doctor`、`sdd run create`、`sdd run status`。
- `schemas/phase-1.2-project-contract.md`
- `schemas/phase-1.2-run-state-contract.md`
- `schemas/phase-1.2-event-log-contract.md`
- `schemas/phase-1.2-artifact-path-contract.md`
- `schemas/phase-1.2-lifecycle-decision-contract.md`
- `specs/master/phase1.2-spec.md`
- `specs/master/phase1.2-plan.md`
- `specs/master/phase1.2-tasks.md`
- `specs/master/phase1.2-validation.md`

## 6. 验收标准

- 在当前仓库执行初始化后能生成或校验 `.sdd/project.yml`。
- 能创建唯一 run 目录并写入 `state.json` 与 `events.jsonl`。
- `sdd doctor` 能输出 PASS / WARN / FAIL，并列出可操作原因。
- 重复执行不会破坏已有 run。
- 所有写入范围限定在 `.sdd/` 和本平台包代码内。
- `npm run typecheck` 通过。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.2-runtime-skeleton.md
required_by:
  - phase-1.3-contract-templates-adapters
  - phase-1.5-sdd-parser-task-model
  - phase-1.6-artifact-delegation-contract
  - phase-1.7-claude-code-command-integration
  - phase-1.8-single-task-loop
  - phase-1.10-real-project-trial
```

# Phase 2.8 Spec

## Problem

Phase 2.7 已完成全局安装、init/update/doctor/instructions 与 entry projection E2E，但真实仓库试跑后暴露出工作流体验 gap：用户需要理解 `.sdd/runs/<run_id>`、artifacts 与 sync-back proposal 才知道下一步；verified run 不会自动修改 `tasks.md`，但缺少受控同步入口。

## Goals

- 提供项目级状态入口：任务、run、gap、下一步建议。
- 提供 run 列表与 run inspect，减少用户直接读 `.sdd/runs` 的成本。
- 提供 sync-back inspect/apply，保持 proposal-only 默认原则，同时允许显式写回 `tasks.md`。
- 让 generated Claude Code entries 使用 status-first 工作流。

## Non-goals

- 不改变 SDD runtime 的 artifact-mode 执行模型。
- 不启动外部 agent API。
- 不默认写回 spec/plan/tasks。
- 不实现 Phase 3 平台化扩展能力。

## Acceptance

- CLI 提供 `status`、`run list`、`run inspect`、`sync-back inspect`、`sync-back apply`。
- `sync-back apply` 有明确安全门禁和幂等行为。
- `tasks.md` 默认不被 `do` / `verify` 修改。
- `/sdd` 与 `/sdd:instructions` 引导用户先看 `sdd status`。

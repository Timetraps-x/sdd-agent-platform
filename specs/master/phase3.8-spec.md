# Phase 3.8 Spec

## Problem

Phase 3.7 已经能在执行前 dry-run 判定 task 是否需要 worktree，但还没有实际的 worktree lifecycle 管理边界。如果后续 executor 直接调用 git worktree，会把创建、保留、清理、dirty 保护、run/task 归属和审计事件混进 background executor 或 wave executor。

## Goal

建立 Worktree Lifecycle Manager：在 isolation decision 之后，为需要隔离的 task 提供可追踪、可审计、可安全清理的本地 git worktree 生命周期 API、CLI 和 doctor 可见性。

## Requirements

- Core 提供 Phase 3.8 worktree lifecycle contract/version、status、record 和 inspection 类型。
- Run state 必须记录 worktree 与 run/task 的绑定关系，包括 worktree id、branch、path、base ref、status、dirty state 和 keep/remove metadata。
- Core 提供 create/inspect/keep/remove lifecycle API。
- Create 必须先读取 Phase 3.7 isolation decision，拒绝 `blocked` 和 `none` 模式。
- Remove 必须拒绝 dirty worktree，不执行 force/reset/clean。
- Keep 必须保留 worktree 并记录 reason，供人工检查。
- Lifecycle 操作必须写入 append-only run events。
- Doctor 必须报告 lifecycle contract visibility，并能发现 dirty、missing、orphan、duplicate 或 stale worktree state。
- CLI 提供 `sdd worktree create/inspect/keep/remove` 可见性。

## Acceptance

- Worktree 创建后能在 run state 中按 run/task/worktree id 追踪。
- Clean worktree 可以通过 lifecycle remove 安全删除并标记为 removed。
- Dirty worktree 删除会被拒绝，并可转为 kept 供人工检查。
- Lifecycle event 可审计。
- Doctor 能报告 worktree lifecycle contract visibility 和 lifecycle state issue。
- Phase 3.8 不执行 task、不 merge/reconcile、不 force push/reset/clean、不调度 dependency wave。

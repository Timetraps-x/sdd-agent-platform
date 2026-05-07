# Phase 3.8 Worktree Lifecycle Manager

## 定位

Phase 3.8 在 Phase 3.7 的隔离 contract 上实现本地 worktree lifecycle：创建、进入、保留、清理、失败恢复和审计事件。

## 依赖

- Phase 3.7 Worktree Isolation Contract。
- Phase 3.4 Delegation State Machine。
- 本地 git capability。

## 范围

- 定义 worktree state、路径、branch naming、owner run/task 绑定。
- 实现 create/inspect/keep/remove lifecycle API。
- 记录 worktree lifecycle events。
- 提供 cleanup gate，避免误删用户改动。

## 非目标

- 不执行 task。
- 不自动 merge。
- 不 force push/reset/clean。
- 不调度 dependency wave。
- 不绕过用户确认删除有改动的 worktree。

## 交付物

- `phase3.8-spec.md`、`phase3.8-plan.md`、`phase3.8-tasks.md`、`phase3.8-validation.md`。
- Worktree lifecycle API/CLI/doctor check。
- Safety tests 覆盖 keep/remove/dirty worktree refusal。

## 验收标准

- Worktree 创建与 run/task 可追踪。
- Dirty worktree 删除必须被拒绝或显式确认。
- Lifecycle event 可审计。
- Doctor 能发现 orphan/stale worktree state。

## 下游引用

- Phase 3.11 background executor 可按需为单 task 请求 worktree。
- Phase 3.12 wave executor 必须通过本 lifecycle 管理并发 worktree。

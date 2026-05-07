# Phase 3.7 Spec

## Problem

Phase 3 已有 capability、plugin、delegation queue/state machine、worker adapter 和 artifact ingestion contract，但还缺少执行前的 worktree isolation 判定边界。如果后续 executor 直接创建 worktree，会把文件 overlap、capability side effect、task risk 和人工 gate 混进 lifecycle manager 或 wave executor。

## Goal

建立 Worktree Isolation Contract：基于 task metadata、capability side effect 和 peer task overlap，提供只读 dry-run isolation decision，明确哪些任务不需要 worktree、哪些必须隔离、哪些被阻塞、哪些需要人工 gate。

## Requirements

- Core 提供 Phase 3.7 worktree isolation contract/version、mode、gate、peer、decision 类型。
- `inspectWorktreeIsolation(projectRoot, { branch, taskId, capabilityId, peerTaskIds })` 必须只读取 specs 和 capability registry，不创建或删除 worktree。
- Decision mode 必须包含 `none`、`required`、`blocked`、`manual`。
- 同一文件 overlap 的非 read-only capability 必须被判定为 unsafe concurrency，并返回 `blocked`。
- Read-only capability 不强制 worktree，允许返回 `none`。
- High-risk local write task 必须返回 `required` 或 `manual`。
- CLI 提供 `sdd isolation inspect <task_id>` dry-run 可见性。
- Doctor 必须报告 isolation contract 可读取。

## Acceptance

- 同一文件 overlap 的写任务不能被判定为可安全并发。
- Read-only task 不强制 worktree。
- High-risk local write task 能被标记为 isolation required 或 manual gate。
- CLI 能 inspect dry-run isolation decision。
- Doctor 能检查 isolation contract 可读取。
- Phase 3.7 不创建 worktree、不清理 worktree、不执行 task、不 merge/reconcile、不实现 wave planner。

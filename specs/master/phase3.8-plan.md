# Phase 3.8 Plan

## Approach

1. 增加 `WORKTREE_LIFECYCLE_CONTRACT_VERSION` 和 lifecycle status/record/inspection 类型。
2. 将 `RunState` 扩展为包含 `worktrees: Record<string, WorktreeLifecycleRecord>`，并在 `createRun` 初始化空记录。
3. 实现 `createWorktreeLifecycle(projectRoot, runId, options)`：
   - 读取 run state 和 Phase 3.7 isolation decision。
   - 拒绝 `blocked` / `none` decision。
   - 使用 `.sdd/worktrees/<worktreeId>` 作为本地 worktree path。
   - 使用 `sdd-<worktreeId>` 作为分支名。
   - 执行 `git worktree add -b <branch> <path> <baseRef>`。
   - 写入 run state 并追加 `worktree_created` event。
4. 实现 `inspectWorktreeLifecycle(projectRoot, runId)`：
   - 读取 state 中的 lifecycle records。
   - 检查 active/kept worktree 是否存在、是否在 `git worktree list --porcelain` 中注册、是否 dirty。
   - 检查 removed record 是否残留 path。
   - 检查重复 active path 和 `.sdd/worktrees` 下 orphan directory。
5. 实现 `keepWorktreeLifecycle(projectRoot, runId, worktreeId, { reason })`：
   - 将 record 标记为 `kept`。
   - 记录 keep reason 和 dirty state。
   - 追加 `worktree_kept` event。
6. 实现 `removeWorktreeLifecycle(projectRoot, runId, worktreeId)`：
   - 删除前检查 dirty state。
   - dirty 时拒绝并要求 commit/stash/keep。
   - clean 时执行 `git worktree remove <path>`。
   - 标记为 `removed` 并追加 `worktree_removed` event。
7. Doctor 增加 lifecycle contract check，并在 run evidence inspection 中纳入 lifecycle issue。
8. CLI 增加：
   - `sdd worktree create <run_id> <task_id> [--base <ref>] [--id <worktree_id>] [--json]`
   - `sdd worktree inspect <run_id> [--json]`
   - `sdd worktree keep <run_id> <worktree_id> [--reason <text>] [--json]`
   - `sdd worktree remove <run_id> <worktree_id> [--json]`
9. Tests 覆盖 clean create/remove、dirty remove refusal、keep for inspection、doctor visibility、CLI smoke。
10. 更新 retained docs/index/status 并执行 typecheck/test/build/doctor/CLI smoke。

## Safety

- Phase 3.8 只管理 worktree lifecycle，不执行 task command、worker adapter 或 validation command。
- 不自动 merge/reconcile，不修改 sync-back state。
- 不执行 force push/reset/clean。
- Dirty worktree remove 默认拒绝；保留路径供人工检查。
- Worktree lifecycle state 和 events 只作为 Phase 3.11+ executor 的输入 contract。

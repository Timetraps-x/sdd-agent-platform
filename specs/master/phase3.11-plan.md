# Phase 3.11 Plan

## Approach

1. 增加 `BACKGROUND_EXECUTOR_CONTRACT_VERSION` 和 background executor options/result/inspection 类型。
2. 实现 `runBackgroundExecutor(projectRoot, options)`：
   - 默认读取 `master` branch，默认 agent 为 `implementer`，默认 worker adapter 为 `sdd-cli-task-worker`。
   - 如传入 `runId` 则复用 run state，否则创建新 run。
   - 通过 worker adapter contract 校验 adapter 存在且不是 manual handoff。
   - 通过 `parseSddBranch` / `inspectSddTask` 校验 task。
   - 通过 `inspectWorktreeIsolation` 阻断 manual/blocked isolation decision。
   - 生成或复用 stable delegation id，拒绝 terminal delegation reopen。
   - claim delegation 后持久化 run status/phase/currentTask，并记录 `delegation_started` 或 `background_executor_resumed` event。
   - 未提供 artifact 时返回 `claimed`，不伪造 terminal result。
   - 提供 artifact 时调用 `ingestArtifactResult`，根据 ingestion result 设置 executor/run terminal status。
3. 实现 `inspectBackgroundExecutor(projectRoot, runId)`：
   - 读取 delegation queue snapshot。
   - 读取 artifact ingestion inspection。
   - 汇总 running/terminal delegations、ingestion records、issues。
4. Doctor 增加 `background_executor_contract` PASS/FAIL visibility。
5. CLI 增加：
   - `sdd background run <task_id> [--run <run_id>] [--agent <agent>] [--worker <adapter_id>] [--artifact <path>] [--branch <branch>] [--delegation <delegation_id>] [--json]`
   - `sdd background inspect <run_id> [--json]`
6. Tests 覆盖：
   - claim 单 delegation 并持久化 background run state。
   - valid artifact ingestion terminal completed。
   - invalid artifact blocked。
   - manual handoff worker blocked。
   - doctor contract visibility。
   - CLI human/JSON run/inspect。
7. 更新 retained docs/index/status 并执行 typecheck/test/build/doctor/CLI smoke。

## Safety

- Phase 3.11 只执行显式单 task background delegation claim/run/ingest。
- 不执行 dependency wave。
- 不自动调用外部 Claude Code 或 agent 进程。
- 不自动 sync-back apply。
- 不绕过本地命令、Claude Code 或用户权限提示。
- 不做 destructive cleanup。
- 不创建 worktree，除非未来 executor route 明确接入 Phase 3.8 lifecycle；本 phase 仅尊重 isolation decision。

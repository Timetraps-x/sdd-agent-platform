# Phase 3.12 Plan

## Approach

1. 增加 `WAVE_EXECUTOR_CONTRACT_VERSION` 和 wave executor options/result/inspection 类型。
2. 实现 `runWaveExecutor(projectRoot, options)`：
   - 默认读取 `master` branch。
   - 默认 capability 为 `native-file-edit`。
   - 默认 agent 为 `implementer`，默认 worker adapter 为 `sdd-cli-task-worker`。
   - 默认 strategy 为 `fast-stop`。
   - 如传入 `runId` 则复用 run state，否则创建新 run。
   - 调用 `inspectWavePlan` 获取 planner 结果，不重新计算 safety decision。
   - 写入 `wave_executor_started` event，并设置 run status/phase。
   - 如果 plan invalid、manual gates 或 blocked tasks 存在，写入 `wave_executor_blocked` event 并返回 blocked。
3. 对每个 planner-safe wave：
   - 写入 `wave_executor_wave_started` event。
   - 对 wave 内 task 调用 `runBackgroundExecutor`，delegation id 使用 wave/task/agent 稳定派生。
   - 支持通过 `artifactPaths` 传入 task-specific artifact。
   - 写入 `wave_executor_wave_completed` event。
4. Stop strategy：
   - `fast-stop`：遇到第一个 non-completed task 停止当前 wave 和后续 wave。
   - `safe-continue`：继续当前 wave 中其它独立 task，但停止后续依赖 wave。
5. 汇总 status：
   - 任一 task blocked => wave result blocked。
   - 任一 task failed => wave result failed。
   - 有 claimed 或未执行完计划 task => wave result claimed。
   - 全部完成 => completed。
6. 实现 `inspectWaveExecutor(projectRoot, runId)`：
   - 读取 background executor inspection。
   - 读取 run events 并过滤 `wave_executor_*` events。
   - 汇总 issues，缺少 wave executor event 时报告 invalid。
7. Doctor 增加 `wave_executor_contract` PASS/FAIL visibility。
8. CLI 增加：
   - `sdd wave run [--branch <branch>] [--run <run_id>] [--capability <id>] [--agent <agent>] [--worker <adapter_id>] [--strategy fast-stop|safe-continue] [--artifact <task_id:path>]... [--json]`
   - `sdd wave executor <run_id> [--json]`
9. Tests 覆盖：
   - supplied artifacts 完成 planner-safe wave。
   - manual/blocked planner gates 执行前 blocked。
   - `safe-continue` 完成当前 wave 且不跨 dependency boundary。
   - doctor contract visibility。
   - CLI human/JSON wave run and inspect。
10. 更新 retained docs/index/status 并执行 typecheck/test/build/doctor/CLI smoke。

## Safety

- Phase 3.12 只执行 Phase 3.10 planner 判定的 safe waves。
- 不重新计算或放宽 planner safety decision。
- 不自动调用 sync-back apply。
- 不自动 merge worktree 改动。
- 不绕过本地命令、Claude Code 或用户权限提示。
- 不对 manual/blocked gates 做隐式降级或强行继续。

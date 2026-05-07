# Phase 3.10 Plan

## Approach

1. 增加 `WAVE_PLANNER_CONTRACT_VERSION` 和 wave task/wave/gate/plan 类型。
2. 实现 `inspectWavePlan(projectRoot, { branch, capabilityId })`：
   - 调用 `inspectTaskGraph` 读取 Phase 3.9 graph plan。
   - 对每个 graph node 调用 `inspectWorktreeIsolation` 获取 isolation decision。
   - 将 graph/global blocking diagnostics、task diagnostics、isolation blocked task 归入 blocked tasks。
   - 将 isolation manual task 归入 manual gates。
   - 将依赖 blocked/manual/non-plannable task 的 downstream task 归入 blocked tasks。
   - 对剩余 candidate 按 `depends_on` 做拓扑 wave 规划。
   - 通过 Phase 3.9 `fileOverlapEdges` 避免同一 wave 内文件 overlap。
3. Doctor 增加 `wave_planner_contract` PASS/FAIL visibility。
4. CLI 增加：
   - `sdd wave inspect [--branch <branch>] [--capability <capability_id>] [--json]`
5. Tests 覆盖：
   - dependency wave order。
   - file overlap wave separation。
   - manual gates + downstream blocked tasks。
   - graph diagnostics blocked tasks。
   - doctor visibility。
   - CLI human/JSON output。
6. 更新 retained docs/index/status 并执行 typecheck/test/build/doctor/CLI smoke。

## Safety

- Phase 3.10 只读 specs、project config 和 contract-derived planner output。
- 不执行 task、validation command、worker adapter 或 delegation。
- 不创建/删除 worktree。
- 不修改 run state、events、artifacts、sync-back state 或 tasks.md。
- `wave plan` 只是 Phase 3.11+ executor 的输入 contract，不自动启动并发执行。

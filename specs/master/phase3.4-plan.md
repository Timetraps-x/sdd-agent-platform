# Phase 3.4 Plan

## Approach

1. 在 `packages/core/src/index.ts` 增加 `DELEGATION_STATE_MACHINE_VERSION`。
2. 定义内置 delegation status 集合、terminal status 集合和 transition 表。
3. 实现 `getDelegationStateMachine()` 返回只读 state machine snapshot。
4. 实现 `validateDelegationStateTransition(from, to, event?)`，拒绝未声明 transition 和 terminal status reopen。
5. 在 doctor 中增加 `delegation_state_machine` contract visibility check。
6. 在 run evidence doctor 中从 `events.jsonl` 重建 delegation event transition，并报告非法事件序列。
7. 在 `packages/cli/src/main.ts` 增加 `sdd state-machine inspect [--json]`。
8. 更新 CLI help。
9. 在 `packages/core/src/index.test.ts` 增加 API、doctor、CLI 和非法 transition 覆盖。
10. 创建 retained Phase 3.4 docs 并更新 indexes/status。
11. 运行 typecheck/test/build/doctor/state-machine CLI smoke。

## Safety

- State machine contract 是静态声明和只读校验，不写入 queue 或执行状态。
- Phase 3.4 不启动 worker，不执行 task，不读取或合并 artifact result。
- Terminal status 不允许转回 RUNNING；retry 必须从 RECOVERABLE 进入 RUNNING，后续 executor 如需重跑 terminal delegation 必须创建新 delegation id。
- Event transition check 只报告问题，不自动修复 run state/events。

# Phase 3.4 Delegation State Machine

## 定位

Phase 3.4 定义后台 delegation 的状态机和事件转移。它把 queue item 从创建到终态的状态、事件、重试、取消和超时规则固化为可验证 contract，但不执行 worker。

## 依赖

- Phase 3.3 Delegation Queue Contract。
- Phase 1 run state/events/delegation lifecycle。

## 范围

- 定义 delegation queue item 的状态集合、终态集合和允许转移。
- 定义 retry、cancel、timeout、terminal event 的事件语义。
- 定义状态写入与 `.sdd/runs/<run_id>/events.jsonl` 的审计关系。
- 增加 state machine 校验 API/doctor visibility。

## 非目标

- 不启动后台 worker。
- 不执行 task。
- 不读取或合并 artifact result。
- 不创建 worktree。
- 不调度 dependency wave。

## 交付物

- `phase3.4-spec.md`、`phase3.4-plan.md`、`phase3.4-tasks.md`、`phase3.4-validation.md`。
- Delegation state machine 类型、transition validator 和 doctor check。
- 状态转移测试。

## 验收标准

- 每个 delegation 状态只能按声明的 transition 推进。
- 终态 delegation 不会被重新标记为 running。
- Cancel/timeout/retry 都有可审计事件。
- Doctor 能发现非法状态或缺失 terminal event。

## 下游引用

- Phase 3.5 的 worker adapter 必须按本状态机写入执行状态。
- Phase 3.11 的 background executor 必须复用本状态机推进 delegation。

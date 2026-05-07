# Phase 3.4 Spec

## Problem

Phase 3.3 已定义只读 delegation queue item，但 queue item 的状态推进规则仍隐含在 run events 和 liveness 校验中。若直接进入 worker adapter，会让执行器自行决定可转移状态、终态重开、重试、取消和超时语义，导致后台执行不可审计。

## Goal

建立 Delegation State Machine Contract：声明 delegation 状态集合、终态集合、允许 transition、事件语义和 doctor visibility，为 Phase 3.5 worker adapter 与 Phase 3.11 background executor 提供统一状态推进边界，不启动 worker。

## Requirements

- Core 定义 Phase 3.4 state machine version、state machine 类型和 transition validation 类型。
- State machine 必须声明所有 delegation status、terminal status 和允许 transition。
- `validateDelegationStateTransition()` 能拒绝非法转移，尤其是 terminal status 重新转回 running。
- Runtime event 审计能识别 cancel、timeout、retry 相关事件语义。
- Doctor 包含 `delegation_state_machine` PASS/FAIL check，并能发现 events 中非法 transition。
- CLI 提供只读 `sdd state-machine inspect [--json]`。
- Tests 覆盖 API、doctor、CLI help/inspect 和非法 transition。

## Acceptance

- 状态机能表达 PENDING/RUNNING/RECOVERABLE/STALE 到 terminal status 的允许推进。
- Terminal delegation 不允许重新进入 RUNNING。
- Cancel/timeout/retry 均有声明事件：`delegation_cancelled`、`delegation_timeout`、`delegation_retry_started`。
- Doctor 能报告 state machine contract visibility，并能发现 terminal delegation 后再次 started 的非法 event transition。
- Phase 3.4 不实现 worker、task execution、artifact ingestion、worktree 或 wave scheduling。

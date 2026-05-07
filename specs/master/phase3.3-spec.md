# Phase 3.3 Spec

## Problem

Phase 3.2 已经建立静态 plugin loading contract，但后台 delegation 还没有独立 queue contract。若直接进入 worker 或 state machine，会把入队条件、去重、状态事实源、capability mapping 和执行副作用混在一起。

## Goal

建立只读 Delegation Queue Contract：从现有 run-state delegations 派生 queue item，提供 core API、CLI list/inspect 和 doctor visibility，不新增可漂移队列事实源，不启动后台执行。

## Requirements

- Core 定义 Phase 3.3 queue contract version、queue item 和 snapshot 类型。
- Queue item 必须包含 id、run id、delegation id、task id、agent、requested capability、dedupe key、status source、run mode、expected artifact 和 required evidence。
- Queue snapshot 必须从 `.sdd/runs/<run_id>/state.json` 的 delegations 派生，默认跳过 archived runs。
- CLI 提供 `sdd queue list [--run <run_id>] [--json]` 与 `sdd queue inspect <id> [--json]`。
- Doctor 包含 `delegation_queue_contract` PASS/FAIL check。
- Tests 覆盖 API、doctor、CLI help/list/inspect。

## Acceptance

- `listDelegationQueueItems()` 能返回稳定排序的 queue item。
- `inspectDelegationQueueItem()` 能按 `<run_id>:<delegation_id>` 查找。
- `sdd queue list` 展示 task/agent/status/capability。
- `sdd doctor --latest-only` 出现 `delegation_queue_contract` PASS。
- Phase 3.3 不实现 enqueue mutation、worker、background write、worktree 或 wave scheduling。

# Phase 3.3 Plan

## Approach

1. 在 `packages/core/src/index.ts` 增加 Delegation Queue Contract 类型与 `DELEGATION_QUEUE_CONTRACT_VERSION`。
2. 实现 `listDelegationQueueItems(projectRoot, { runId? })`，从现有 run-state delegations 派生 queue snapshot。
3. 实现 `inspectDelegationQueueItem(projectRoot, queueItemId)`。
4. Queue item 使用 `<run_id>:<delegation_id>` 作为稳定 id，使用 `<run_id>:<task_id>:<agent>` 作为 dedupe key。
5. 默认跳过 archived runs，避免普通 queue 视图混入历史证据。
6. 在 doctor 中增加 `delegation_queue_contract` check，并验证 requested capability 引用 Phase 3.1 registry。
7. 在 `packages/cli/src/main.ts` 增加 `sdd queue list/inspect` 和 human-readable render helper。
8. 更新 CLI help。
9. 在 `packages/core/src/index.test.ts` 增加 API、doctor、CLI 和 help 覆盖。
10. 创建 retained Phase 3.3 docs 并更新 indexes/status。
11. 运行 typecheck/test/build/doctor/queue CLI smoke。

## Safety

- Queue contract 是派生只读视图，不新增 `.sdd/queue` 文件。
- Phase 3.3 不做 enqueue mutation，不 claim queue item，不启动 worker。
- Queue status source 明确为 `run_state_delegation`。
- requested capability 当前固定映射到 `sdd-cli`，后续 Phase 3.5 worker adapter contract 再细化 adapter-specific capability。
- 不改变 Claude Code permission model。

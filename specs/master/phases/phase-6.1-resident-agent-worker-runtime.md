# Phase 6.1 Resident Agent Worker Runtime

## 1. 定位

Phase 6.1 是 Phase 6.0 Agent / Skill / Team Runtime Harness 之后的小阶段，目标是把 agent 从一次性 prompt/调用记录推进到 SDD 可识别、可续租、可观察的 resident worker runtime。它为后续 chief/coordinator、review-lite、hyperplan、security-research、并行 reviewer/validator/security worker 打基础，但本阶段只落合同层和本地 evidence surface。

## 2. 为什么需要

Phase 6.0 已经能回答“为什么这个任务该路由给哪个 agent/team mode”，但还不能回答：

- 哪个长期 worker 正在持有这个任务？
- 这个 worker 的 lease 是否还有效？
- worker 是否只是卡住但 delegation 仍 running？
- run inspect / doctor 如何看到 worker 状态？
- 后续 daemon 或 tmux host 如何用 SDD state 作为 source of truth？

Phase 6.1 用 runtime record + lease + heartbeat 解决这些问题。

## 3. Runtime Contract

Runtime record 存在：

```text
.sdd/runs/<run_id>/worker-runtimes/<runtime_id>.json
```

核心字段：

- `runtimeId`
- `runId`
- `taskId`
- `agent`
- `workerAdapterId`
- `delegationId`
- `queueItemId`
- `expectedArtifact`
- `status`
- `claimedAt`
- `lastHeartbeatAt`
- `leaseSeconds`
- `leaseExpiresAt`
- `updatedAt`
- `evidenceSummary`

## 4. 状态语义

| Status | Meaning |
|---|---|
| `claimed` | 已通过 background executor claim delegation，并写入 runtime record。 |
| `active` | heartbeat 仍在 lease 内，worker 可视为活跃。 |
| `stale` | lease 已过期，但 delegation 仍 running，需要检查 worker 或重新 claim。 |
| `terminal` | delegation 已进入 terminal 状态，runtime 不能通过 heartbeat 重新激活。 |
| `blocked` | claim/inspect 发现 adapter、queue、contract 等问题。 |

## 5. 与 Phase 6.0 的关系

- Phase 6.0 决定 task 应使用哪个 agent/team/capability。
- Phase 6.1 记录某个 worker runtime 如何持有和维持这个 execution slot。
- AgentExecutionRecord / TeamSessionRecord 仍记录执行和协作证据。
- Resident worker runtime 只增加 liveness / lease / observability，不改变 completion gate。

## 6. 非目标

- 不实现完整 daemon。
- 不实现 tmux focus/grid UI。
- 不实现远程 worker fleet。
- 不让 heartbeat 生成 artifact 或通过 verify。
- 不让 resident worker 绕过 lifecycle risk gate、tool permission、review、validation、sync-back。

## 7. 验收

- `sdd worker-runtime claim <task_id>` 创建 runtime record 和 background delegation claim。
- `sdd worker-runtime heartbeat <runtime_id> --run <run_id>` 续租 runtime。
- `sdd worker-runtime status --run <run_id>` 汇总 active/stale/terminal runtime。
- `sdd worker-runtime inspect <runtime_id> --run <run_id>` 显示 adapter、queue、lease 和安全下一步。
- `sdd run inspect <run_id>` 显示 worker runtime evidence。
- `sdd doctor --latest-only` 能提示 stale running runtime。

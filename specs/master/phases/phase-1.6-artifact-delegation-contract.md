# Phase 1.6 Artifact 与 Delegation Contract

## 1. 定位

Phase 1.6 在 Phase 1.2 runtime skeleton 和 Phase 1.3 static contracts 完成后，让 agent 输出从聊天内容变成可校验、可恢复、可审计的 artifact。

本阶段定义 artifact 与 delegation contract，并实现最小校验和 liveness 记录；不直接启动 Claude Code subagent。

## 2. 依赖

```yaml
depends_on:
  - phase-1.2-runtime-skeleton
  - phase-1.3-contract-templates-adapters
blocks:
  - phase-1.8-single-task-loop
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```

## 3. 范围

- 定义并解析 `sdd-result` fenced block。
- 校验 `agent / task / status / version / artifacts`。
- 记录 delegation started / completed / failed / timed out。
- 检查 expected artifact 是否存在、非空、task id 是否匹配。
- 检查 RUNNING delegation 是否 stale。

## 4. 非目标

- TypeScript runtime 不直接启动 Claude Code subagent。
- 不实现后台任务守护进程。
- 不实现自动 retry。
- 不实现完整 single task loop。

## 5. 交付物

- artifact contract 文档。
- delegation contract 文档。
- `sdd-result` parser / validator。
- delegation event 记录规则。
- stale RUNNING 检查规则。

## 6. 验收标准

- 合法 artifact 能通过校验。
- 缺失、空文件、格式错误、task 不匹配能被判定为 invalid。
- stale RUNNING delegation 能被 doctor 或 run status 检出。
- delegation terminal state 能被 event log 审计。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.6-artifact-delegation-contract.md
required_by:
  - phase-1.8-single-task-loop
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```

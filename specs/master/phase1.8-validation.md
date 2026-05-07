# Phase 1.8 Validation — 单 Task 执行闭环

## Validation scope

本阶段修改 TypeScript runtime / CLI、tests、command docs 与 retained docs，因此执行 TypeScript typecheck、tests、build，并进行 `sdd do task` CLI smoke。

## Evidence

### 1. TypeScript typecheck

命令：

```text
npm run typecheck
```

结果：PASS。

输出摘要：

```text
> sdd-agent-platform@0.1.0 typecheck
> tsc --noEmit
```

### 2. Test suite

命令：

```text
npm test
```

结果：PASS。

输出摘要：

```text
1..25
# tests 25
# suites 0
# pass 25
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

新增覆盖点：

- `runSingleTaskLoop` 在 reviewer + validator artifact 合法且 PASS 时 completed，并写入 state/events/syncBack。
- `runSingleTaskLoop` 使用 `delegation_started` / `delegation_completed` / `delegation_failed` 事件，不再用泛化 `agent_completed` / `agent_failed` 表示 delegation terminal event。
- `runSingleTaskLoop` 在 validator 返回 `PASS_WITH_GAPS` 时 blocked，生成 gap report 与 blocked sync-back proposal，不硬标 completed。
- `runSingleTaskLoop` 在缺少必需 artifact 时 blocked，生成 gap report 和 proposal。
- 成功路径确认 runtime 不修改 `tasks.md`。

### 3. Build

命令：

```text
npm run build
```

结果：PASS。

输出摘要：

```text
> sdd-agent-platform@0.1.0 build
> tsc -b
```

### 4. CLI smoke — create run

命令：

```text
npm run sdd -- run create
```

结果：PASS。

输出摘要：

```json
{
  "runId": "20260501-011",
  "statePath": ".sdd/runs/20260501-011/state.json",
  "eventLogPath": ".sdd/runs/20260501-011/events.jsonl"
}
```

### 5. CLI smoke — completed single-task loop

预置 artifacts：

```text
.sdd/runs/20260501-011/artifacts/review-P1.8-T1.md
.sdd/runs/20260501-011/artifacts/validation-P1.8-T1.md
```

命令：

```text
npm run sdd -- do task P1.8-T1 --branch master --run 20260501-011 --review-artifact artifacts/review-P1.8-T1.md --validation-artifact artifacts/validation-P1.8-T1.md
```

结果：PASS。

输出摘要：

```json
{
  "runId": "20260501-011",
  "taskId": "P1.8-T1",
  "status": "completed",
  "message": "Task loop completed from supplied contract artifacts.",
  "syncBackProposalPath": "artifacts/sync-back-proposal.md",
  "gaps": []
}
```

事件证据：`events.jsonl` 写入 `delegation_started`、`delegation_completed`、`run_completed`，未写入 `agent_completed`。

### 6. CLI smoke — PASS_WITH_GAPS blocked path

预置 artifacts：

```text
.sdd/runs/20260501-012/artifacts/review-P1.8-T1.md
.sdd/runs/20260501-012/artifacts/validation-P1.8-T1.md
```

命令：

```text
npm run sdd -- do task P1.8-T1 --branch master --run 20260501-012 --review-artifact artifacts/review-P1.8-T1.md --validation-artifact artifacts/validation-P1.8-T1.md
```

结果：预期 exit 1，PASS。

输出摘要：

```json
{
  "runId": "20260501-012",
  "taskId": "P1.8-T1",
  "status": "blocked",
  "message": "Task loop blocked because validator returned PASS_WITH_GAPS; inspect gap report and sync-back proposal.",
  "acceptedArtifacts": ["artifacts/review-P1.8-T1.md", "artifacts/validation-P1.8-T1.md", "artifacts/gap-report-P1.8-T1.md"],
  "syncBackProposalPath": "artifacts/sync-back-proposal.md",
  "gaps": [{ "field": "validation_gaps", "message": "Validator returned PASS_WITH_GAPS; Phase 1.8 cannot mark the task completed without structured gap evidence and explicit sync-back proposal semantics." }]
}
```

事件证据：`events.jsonl` 写入 `delegation_completed`、`gap_created`、`sync_back_proposed(status=blocked)`、`gap_escalated`，未写入 `run_completed`。


### 7. CLI smoke — missing artifact blocked path

命令：

```text
npm run sdd -- do task P1.8-T1 --branch master
```

结果：预期 exit 1，PASS。

输出摘要：

```json
{
  "runId": "20260501-013",
  "taskId": "P1.8-T1",
  "status": "blocked",
  "acceptedArtifacts": ["artifacts/gap-report-P1.8-T1.md"],
  "syncBackProposalPath": "artifacts/sync-back-proposal.md",
  "gaps": [
    {
      "field": "reviewer",
      "message": "reviewer artifact was not supplied; Phase 1.8 does not invoke external agents directly."
    }
  ]
}
```

事件证据：缺失 reviewer artifact 写入 `delegation_failed`，未写入 `agent_failed`。

## Acceptance evidence

- Phase 1.8 single-task loop 以 supplied artifact contract 驱动，不调用外部 agent API。
- Reviewer / validator artifact 为完成 task 的必要 evidence。
- `PASS_WITH_GAPS` 不再作为 completed 终态；runtime 生成 gap report、blocked sync-back proposal，并以 blocked terminal status 退出。
- 缺失 artifact 会生成 gap report 和 sync-back proposal，不硬标 completed。
- Delegation terminal events 使用 Phase 1.6/contract vocabulary：`delegation_completed` / `delegation_failed`。
- Sync-back proposal 只写入 `.sdd/runs/<run_id>/artifacts/sync-back-proposal.md`。
- Phase 1.9 goal-level verifier / doctor hardening 未实现。

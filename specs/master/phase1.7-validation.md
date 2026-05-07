# Phase 1.7 Validation — Claude Code Command Integration

## Validation scope

本阶段修改 TypeScript runtime / CLI、command docs、tests 与 retained docs，因此执行 TypeScript typecheck、tests、build，并进行 lifecycle command smoke。

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
1..22
# tests 22
# suites 0
# pass 22
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

新增覆盖点：

- direct whitelist 仅在 intent/acceptance/validation/impact/risk/reversibility/orchestration 全满足时返回 direct。
- API/contract 与 state-machine hard gates 强制 full profile。
- policy/permission/human checkpoint 触发 checkpoint need，并保留 command boundary。
- unscoutable low impact 进入 research。
- `recordLifecycleDecision` 将 command gate result 写入 run state/events。
- database/data-loss hard gate 强制 full profile 且强制 `human_checkpoint_required=true`。
- 新 lifecycle decision record 使用 canonical contract `sdd-lifecycle-decision-v1` 和 version `1.3.0`。

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

### 4. Lifecycle direct smoke

命令：

```text
npm run sdd -- lifecycle decide --direct-safe
```

结果：PASS。

输出摘要：

```text
Lifecycle Decision Gate
profile=direct
confidence=high
checkpoint_required=false
hard_gates=none
required_stages=intent -> implement -> minimal-validation
skipped_stages=full-spec,full-plan,full-tasks,agent-workflow
```

### 5. Lifecycle hard gate JSON smoke

命令：

```text
npm run sdd -- lifecycle decide --risk database --json
```

结果：PASS。

输出摘要：

```json
{
  "record": {
    "contract": "sdd-lifecycle-decision-v1",
    "version": "1.3.0",
    "decision": {
      "profile": "full",
      "confidence": "medium",
      "hard_gate_hits": ["database_or_data_loss"],
      "required_stages": ["spec", "plan", "tasks", "do", "verify", "sync-back-proposal"],
      "human_checkpoint_required": true
    }
  },
  "checkpointRequired": true
}
```

### 6. Lifecycle run recording smoke

命令：

```text
npm run sdd -- run create
npm run sdd -- lifecycle decide --risk api --contract command-gate --run 20260501-003
npm run sdd -- run status 20260501-003
```

结果：PASS。

输出摘要：

```text
recorded_run=20260501-003
```

```json
{
  "runId": "20260501-003",
  "status": "created",
  "phase": null,
  "currentTask": null
}
```

### 7. Lifecycle direct-safe overridden by database hard gate

命令：

```text
npm run sdd -- lifecycle decide --direct-safe --risk database --json
```

结果：PASS。

输出摘要：

```json
{
  "record": {
    "contract": "sdd-lifecycle-decision-v1",
    "version": "1.3.0",
    "decision": {
      "profile": "full",
      "confidence": "medium",
      "hard_gate_hits": ["database_or_data_loss"],
      "human_checkpoint_required": true
    }
  },
  "checkpointRequired": true
}
```

### 8. Master task gap smoke

命令：

```text
npm run sdd -- tasks gaps --branch master
```

结果：PASS。

输出摘要：

```text
PASS
No task gaps detected.
```

## Acceptance evidence

- Phase 1.7 command gate can collect bounded CLI signals, execute canonical hard gates, route to direct/compact/full/research, and explain confidence/reasons/checkpoint/stages/escalation.
- Existing run state/events can store the lifecycle decision when a run id is supplied.
- 新 lifecycle decision records/output 使用 `sdd-lifecycle-decision-v1` / `1.3.0`；legacy `phase-1.2-lifecycle-decision-contract` 仅作为历史 evidence 兼容，不改写旧 `.sdd` evidence。
- `/sdd-*` command docs now point to the bounded CLI/runtime gate and remain thin.
- No Phase 1.8 single-task implementation loop, no agent dispatch, no verifier/doctor hardening, no worktree/background write/commit/push behavior was added.

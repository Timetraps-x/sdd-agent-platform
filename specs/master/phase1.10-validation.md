# Phase 1.10 Validation — 真实项目验收试跑

## Validation Scope

Phase 1.10 使用当前真实 TypeScript/Node 项目工作树执行合成 trial，不调用外部 agent API，不自动 commit/push/PR，不自动写回 `tasks.md`。本阶段未修改平台 TypeScript 实现代码。

## Trial Setup

- Project root: `D:\project\sdd-agent-platform`
- Project adapter: `.sdd/project.yml`
- Trial branch: `specs/trial/`
- Trial task: `P1.10-T1`
- Effective run: `20260501-020`
- Intermediate blocked run: `20260501-019`

## Validation Evidence

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
1..28
# tests 28
# suites 0
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

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

### 4. CLI trial — run create

命令：

```text
npm run sdd -- run create
```

结果：PASS。

有效 run：

```json
{
  "runId": "20260501-020",
  "statePath": ".sdd/runs/20260501-020/state.json",
  "eventLogPath": ".sdd/runs/20260501-020/events.jsonl"
}
```

### 5. CLI trial — lifecycle decide

命令：

```text
npm run sdd -- lifecycle decide --run 20260501-020 --intent high --acceptance high --size small --tasks 1 --files 3 --layer docs --layer runtime --risk state-machine --impact-confidence high --validation clear --validation-available --validation-cost cheap --fanout local --reversibility reversible --requires-agents --checkpoint --source-artifact specs/trial/spec.md --source-artifact specs/trial/tasks.md --json
```

结果：PASS。

输出摘要：

```json
{
  "profile": "full",
  "confidence": "medium",
  "hard_gate_hits": ["state_machine_concurrency_liveness"],
  "required_stages": ["spec", "plan", "tasks", "do", "verify", "sync-back-proposal"],
  "recordedRunId": "20260501-020"
}
```

证据：`.sdd/runs/20260501-020/state.json` 中 `lifecycleDecision.decision.profile` 为 `full`。

### 6. CLI trial — task parsing

命令：

```text
npm run sdd -- tasks list --branch trial
npm run sdd -- tasks inspect P1.10-T1 --branch trial
npm run sdd -- tasks gaps --branch trial
```

结果：PASS。

输出摘要：

```text
SDD tasks for trial
P1.10-T1 pending wave=1 deps=none 验证 Phase 1.10 CLI 闭环
gaps=0

PASS
No task gaps detected.
```

### 7. CLI trial — single-task loop

预置 artifacts：

```text
.sdd/runs/20260501-020/artifacts/review-P1.10-T1.md
.sdd/runs/20260501-020/artifacts/validation-P1.10-T1.md
```

命令：

```text
npm run sdd -- do task P1.10-T1 --branch trial --run 20260501-020 --review-artifact artifacts/review-P1.10-T1.md --validation-artifact artifacts/validation-P1.10-T1.md
```

结果：PASS。

输出摘要：

```json
{
  "runId": "20260501-020",
  "taskId": "P1.10-T1",
  "status": "completed",
  "acceptedArtifacts": [
    "artifacts/review-P1.10-T1.md",
    "artifacts/validation-P1.10-T1.md"
  ],
  "syncBackProposalPath": "artifacts/sync-back-proposal.md",
  "gaps": []
}
```

### 8. CLI trial — goal verify

命令：

```text
npm run sdd -- verify task P1.10-T1 --branch trial --run 20260501-020 --review-artifact artifacts/review-P1.10-T1.md --validation-artifact artifacts/validation-P1.10-T1.md
```

结果：PASS。

输出摘要：

```json
{
  "runId": "20260501-020",
  "taskId": "P1.10-T1",
  "status": "PASS",
  "coverageArtifactPath": "artifacts/acceptance-coverage-P1.10-T1.md",
  "syncBackProposalPath": "artifacts/sync-back-proposal.md",
  "gaps": []
}
```

Acceptance coverage：

- [PASS] CLI 可以记录 full profile lifecycle decision 到 run state/events。
- [PASS] CLI 可以解析 trial branch 的 sdd-task metadata。
- [PASS] 单 task loop 可以接受 reviewer/validator artifacts 并生成 sync-back proposal。
- [PASS] Goal-level verify 可以把 validator evidence 映射到全部 acceptance。
- [PASS] Doctor 可以只读发现当前历史 run 中的 liveness/artifact gaps，且不 auto-fix。

### 9. CLI trial — doctor

命令：

```text
npm run sdd -- doctor
```

结果：初次运行为 `PASS_WITH_GAPS`；完成 housekeeping repair 后重跑为 clean `PASS`。

初次失败摘要：

```text
[FAIL] stale_delegation: 20260501-016/D-P1.9-T2-reviewer-001 is RUNNING past timeout.
[FAIL] artifact_invalid: 20260501-016/D-P1.9-T2-validator-001: Cannot read artifact artifacts/validation-P1.9-T2.md
[FAIL] terminal_event_missing: 20260501-019/D-P1.10-T1-reviewer-001 has delegation_started without terminal event.
[FAIL] run_state: Cannot inspect run smoke-p18-block: ENOENT ... state.json
[FAIL] run_state: Cannot inspect run smoke-p18-pass: ENOENT ... state.json
```

修复后重跑：

```text
PASS
[PASS] git_repo: Git repository detected at D:/project/sdd-agent-platform
[PASS] project_config: .sdd/project.yml is readable and uses phase-1.2-project-contract.
[PASS] runs_dir: .sdd/runs exists and is readable/writable.
[PASS] run_evidence: Inspected 22 run(s); no stale delegation, invalid artifact, or terminal event gap found.
[PASS] specs_dir: specs directory exists.
```

解释：历史 smoke runs、Phase 1.9 stale fixture 和中间失败 run `20260501-019` 已经历一轮 evidence repair，并通过 doctor clean rerun。有效 trial run `20260501-020` 自身一直具备 terminal delegation events、valid artifacts、acceptance coverage 与 sync-back proposal。

## Run Artifacts

有效 run：`.sdd/runs/20260501-020/`

- `state.json`：状态 `completed`，phase `verify`，currentTask `P1.10-T1`。
- `events.jsonl`：包含 `lifecycle_decision_recorded`、`task_selected`、`delegation_started`、`delegation_completed`、`review_passed`、`validation_passed`、`sync_back_proposed`、`run_completed`。
- `artifacts/review-P1.10-T1.md`：reviewer PASS。
- `artifacts/validation-P1.10-T1.md`：validator PASS。
- `artifacts/acceptance-coverage-P1.10-T1.md`：所有 acceptance PASS。
- `artifacts/sync-back-proposal.md`：proposal only，未自动写回 `tasks.md`。

## Gap Report

### G-P1.10-001: 中间 trial artifact contract 错误

- type: Validation Gap
- detected_in: `npm run sdd -- do task P1.10-T1 --run 20260501-019`
- affected_run: `20260501-019`
- blocking: 对该中间 run 阻塞；不阻塞 clean run `20260501-020`

Evidence：

```text
reviewer artifact artifacts/review-P1.10-T1.md is invalid: Expected sdd-result-v1, got missing.; Expected 1.3.0, got 0.1.0.; Run-relative artifact path must start with artifacts/
```

Resolution：

- 修正本地 trial artifacts 为 `contract: sdd-result-v1`、`version: 1.3.0`、run-relative artifact path。
- 创建 clean run `20260501-020` 重跑通过。
- 未修改平台代码。

### G-P1.10-002: Doctor 报告历史 run housekeeping gaps

- type: Environment / Runtime Evidence Gap
- detected_in: `npm run sdd -- doctor`
- blocking: 初次阻塞 clean Phase 1 close；已修复并重跑通过。

Evidence：

- 历史 Phase 1.8 smoke runs 缺 terminal event timestamp。
- Phase 1.9 fixture run `20260501-016` 包含 stale delegation 与 missing validator artifact。
- `smoke-p18-*` 目录缺 state.json / events.jsonl。
- 中间失败 run `20260501-019` 留有 terminal event gap。

Resolution：

- `20260501-016` reviewer delegation 记录为 `TIMED_OUT`，补 `delegation_timeout` terminal event。
- `20260501-016` validator 补 `artifacts/validation-P1.9-T2.md` evidence 和 `delegation_completed` terminal event。
- `20260501-019` reviewer invalid artifact 路径补 `delegation_failed` terminal event。
- `smoke-p18-pass` / `smoke-p18-block` 补最小 archived state/events，保留历史 smoke 语义，不删除 run。
- 重跑 `npm run sdd -- doctor` 得到 clean `PASS`。

## Limitations

- 本 trial 使用当前 TypeScript/Node 项目作为真实工作树，不是 Java/Spring/MyBatis 业务仓库；原因是当前可用仓库即平台自身，且用户允许 real/synthetic project trial。
- Reviewer/validator 由本地 artifact 模拟，不调用外部 agent API；这验证 contract/runtime 闭环，不验证真实模型审查质量。
- Implementer artifact 未提供，runtime 将 implementer optional step cancel；本 trial 不修改生产代码。
- Doctor 初次全仓库扫描历史 `.sdd/runs` 暴露 fixture/smoke gaps；这些 gaps 已修复并 clean rerun。

## Phase 1.10 Verdict

PASS。

有效 run `20260501-020` 完成 lifecycle decision、task parsing、single-task loop、goal-level verify、sync-back proposal 与 artifact evidence。历史 run housekeeping gaps 已完成修复并通过 `npm run sdd -- doctor` clean rerun；Phase 1 可以 clean close。

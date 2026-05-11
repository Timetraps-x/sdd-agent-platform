# Phase 5.3 Spec

## Metadata

- phase_id: `5.3`
- title: `Task Graph / Run Evidence Harness`
- status: `completed`
- depends_on: `5.2`
- blocks: `5.4`
- source_artifact: `specs/master/phases/phase-5.3-task-graph-run-evidence-harness.md`

## Problem / Intent

当前 task 容易退化为 checklist，runtime evidence 也难以支撑 review、debug、validation 和 gap closure。Phase 5.3 将 task graph 和 run evidence 独立出来，作为 SDD harness 的执行事实源。

## Requirements

- FR-1: `TaskGraphContract` 必须支持 depends_on、wave、affected_files、file ownership、risk、agent_fit、verification availability、autonomy、allowed agents、required artifacts、gap state。
- FR-2: `TaskRunEvidenceContract` 必须标准化 state、events、artifacts、validation evidence、gap artifacts、sync-back proposal。
- FR-3: verifier 必须输出 PASS / GAPS / BLOCKED / HUMAN_NEEDED。
- FR-4: 同文件多风险任务可拆为 review slices，而不是强制并行。

## Out of Scope

- dashboard database。
- automatic commit / push / merge。
- unrestricted background execution。

## Acceptance Criteria

- AC-1: task parser 可读新增 harness fields。
- AC-2: run evidence 能关联 task、agent、artifact、validation、gap。
- AC-3: verifier 状态稳定。
- AC-4: `npm test`、`npm run build` 通过。

# Phase 5.3 Task Graph / Run Evidence Harness

## 1. 定位

Phase 5.3 实现 `TaskGraphContract` 和 `TaskRunEvidenceContract`，把 task 从 checklist 升级为可验证的执行图，并把 `.sdd/runs` 明确为 runtime execution fact source。

## 2. 依赖

- depends_on: Phase 5.2 Workflow / Agent Registry Harness
- blocks: Phase 5.4 Managed Assets / Query Status Harness

## 3. 范围

- task graph 字段：depends_on、wave、affected_files、file ownership、risk、agent_fit、verification availability、autonomy、allowed agents、required artifacts、gap state。
- run state：`.sdd/runs/<run_id>/state.json`。
- event log：`events.jsonl` 记录 phase/task/agent/gate/validation/gap events。
- artifacts：implementation/review/debug/validation/gap/sync-back evidence。
- verifier 输出 PASS / GAPS / BLOCKED / HUMAN_NEEDED。

## 4. 非目标

- 不强制所有任务并行。
- 不替代人工审查。
- 不自动 commit/push/merge。
- 不建设 dashboard database。

## 5. 验收标准

- task graph 可表达依赖、wave、风险、agent_fit 和 verification availability。
- run evidence 可追踪 task execution facts。
- verifier 输出标准状态。
- `npm test`、`npm run build` 通过。

# Phase 1.9 Plan — Goal-level Verify 与 Doctor 加固

## 1. 实施策略

保持 contract-first、本地化、artifact-driven：Phase 1.9 不尝试成为 build runner 或 agent runtime，只在已有 Phase 1.8 run evidence 上做 goal-level verification 与 doctor consistency 检查。

## 2. Verify 设计

- CLI：`sdd verify task <task_id> --run <run_id> [--branch <branch>] [--review-artifact ...] [--validation-artifact ...]`。
- 输入：task acceptance、task validation commands、run state、reviewer artifact、validator artifact。
- artifact discovery：优先使用显式参数；否则从 completed delegation 或 state artifact index 查找 reviewer/validator artifact。
- acceptance coverage：validator artifact 必须显式包含 task acceptance 文本；否则记录 `acceptance_coverage` gap。
- 输出：`artifacts/acceptance-coverage-<task_id>.md` + `artifacts/sync-back-proposal.md`。
- state/events：写入 `phase=verify`、validation status/evidence、`validation_passed|validation_failed`、`sync_back_proposed`。

## 3. Doctor 设计

- 在原有 git/config/runs/specs 检查基础上，遍历 `.sdd/runs/*`。
- 对每个 `state.delegations` 运行 delegation validation。
- stale RUNNING delegation：按 blocking 语义输出 FAIL/WARN。
- terminal state 缺 terminal event：输出 FAIL/WARN。
- completed delegation 的 expected artifact 缺失、为空、contract 非法、task/agent mismatch：输出 artifact_invalid。
- `events.jsonl` 中 `delegation_started` 无 terminal event 且 state 未 terminal：输出 terminal_event_missing。
- doctor 只报告 recovery proposal，不自动修改任何文件。

## 4. 测试计划

- verify PASS：validator artifact 覆盖 acceptance，写 coverage artifact、state、proposal、events。
- verify BLOCKED：validator artifact 合法但未覆盖 acceptance，产生 gap。
- doctor hardening：构造 stale delegation、terminal event 缺失、completed artifact missing，确认 doctor FAIL 且不 auto-fix。
- 保留 Phase 1.8 tests，确保 single-task loop 未被破坏。

## 5. 文档计划

- 新增 `phase1.9-spec.md` / `phase1.9-plan.md` / `phase1.9-tasks.md` / `phase1.9-validation.md`。
- 更新 `commands/sdd-verify.md` 与 `commands/sdd-doctor.md`。
- 更新顶层 `spec.md` / `plan.md` / `tasks.md` / `validation.md` index 链接。
- 更新 `specs/master/phases/PHASE_STATUS.md` 为 completed evidence。

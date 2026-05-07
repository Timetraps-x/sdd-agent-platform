# Phase 1.8 Plan — 单 Task 执行闭环

## 1. 实施策略

采用 contract-first 的最小 runtime loop：不直接调用 agent，而是把 implementer/reviewer/debugger/validator 的输出建模为显式 artifact 输入，并使用 Phase 1.6 的 artifact/delegation 校验机制推进 state transition。

## 2. 设计边界

- `implementer` artifact 可选：真实写代码仍由 Claude Code 主会话/前台执行；runtime 不假设能自动生成实现。
- `reviewer` artifact 必需：没有独立 review 不能 completed。
- `debugger` artifact 可选且最多一个：仅在 review failure 后作为一次修复证据接入。
- `validator` artifact 必需：Phase 1.8 只校验 validator artifact contract，不实现 Phase 1.9 goal-level verify 策略。
- `sync-back-proposal.md` 位于 run artifacts 下，runtime 不改写 Markdown 事实源。

## 3. 代码改动计划

1. 在 `packages/core/src/index.ts` 增加单 task loop 类型、`runSingleTaskLoop` 和渲染函数。
2. 复用 `parseSddBranch` / `inspectSddTask` / `validateSddResultArtifact` / `createDelegationRecord`。
3. 在 loop 中追加 `phase_started`、`task_selected`、`delegation_started`、`delegation_completed|delegation_failed`、`review_passed|review_failed`、`validation_passed|validation_failed`、`gap_created`、`sync_back_proposed`、terminal event。
4. `PASS_WITH_GAPS` 只能形成 blocked gap report + sync-back proposal，不能硬标 completed。
5. 在 `packages/cli/src/main.ts` 增加 `sdd do task` 命令和 help。
6. 在 `packages/core/src/index.test.ts` 增加成功路径、缺失 artifact 阻塞路径、PASS_WITH_GAPS 阻塞路径和 delegation event 名称测试。

## 4. 文档改动计划

- 新增 `phase1.8-spec.md`、`phase1.8-plan.md`、`phase1.8-tasks.md`、`phase1.8-validation.md`。
- 更新 `spec.md`、`plan.md`、`tasks.md`、`validation.md` 索引。
- 更新 `specs/master/phases/phase-1.8-single-task-loop.md`，明确 artifact-mode loop 边界。
- 更新 `PHASE_STATUS.md` 为 completed 并记录 evidence。
- 更新 `commands/sdd-do.md` 从 Phase 1.7 boundary 到 Phase 1.8 artifact-mode command entry。

## 5. 风险与限制

- 当前 loop 不能替代真实 subagent 执行，只保证 runtime 能安全接收和校验证据。
- Validator 的 goal-level acceptance mapping 仍在 Phase 1.9 加固。
- 真实项目完整试跑留到 Phase 1.10。

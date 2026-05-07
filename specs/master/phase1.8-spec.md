# Phase 1.8 Spec — 单 Task 执行闭环

## 1. 目标

在 Phase 1.2 runtime、Phase 1.5 task parser、Phase 1.6 artifact/delegation contract 和 Phase 1.7 command gate 之上，实现一个有界的单 task `/sdd-do` 闭环。

Phase 1.8 的闭环不发明外部 agent API，不自动调用 subagent。runtime 只负责：选择 task、校验已产出的 implement/review/debug/validation artifact、维护 state/events/delegation、生成 gap report 与 sync-back proposal。

## 2. 范围

- 新增 core `runSingleTaskLoop`：读取 `specs/<branch>/tasks.md`，选择一个 task，检查 task gap。
- 新增 CLI `sdd do task <task_id>`：支持 `--branch`、`--run`、`--implement-artifact`、`--review-artifact`、`--debug-artifact`、`--validation-artifact`。
- 使用已有 `sdd-result-v1` 校验 reviewer / validator / optional debugger artifact。
- 使用已有 delegation liveness contract 记录每个 loop step 的状态和 terminal event。
- review 或 validation 缺失/失败时生成 gap report，不硬标 completed。
- 生成 `artifacts/sync-back-proposal.md`，只提出写回建议，不修改 `tasks.md`。
- 更新 tests、command help、Phase 1.8 retained docs 和 index/status。

## 3. 非目标

- 不实现 Phase 1.9 goal-level verifier / doctor hardening。
- 不执行真实 agent/subagent 调度，不绑定 Claude Code 或外部 agent API。
- 不做多 task、dependency wave、并发、worktree isolation。
- 不自动写回 `tasks.md` / `spec.md` / `plan.md`。
- 不自动 commit / push / PR / merge。
- 不做真实项目试跑；Phase 1.10 再做。

## 4. 验收标准

- `sdd do task <task_id>` 能基于已有 task model 选择单 task。
- task metadata 有 blocking gap 时，run 进入 blocked，并生成 gap report/proposal。
- reviewer 与 validator artifact 均合法且 PASS 时，run 进入 completed，state/events/artifacts/syncBack 均更新。
- 缺失或非法 artifact 不被视为成功。
- debugger 最多通过一个 `--debug-artifact` 显式接入，不自动无限 retry。
- retained top-level indexes 只新增 Phase 1.8 链接，不被覆盖为 phase body。
- `npm run typecheck`、`npm test`、`npm run build` 和 CLI smoke 通过。

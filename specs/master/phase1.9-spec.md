# Phase 1.9 Spec — Goal-level Verify 与 Doctor 加固

## 1. 目标

在 Phase 1.8 artifact-mode single-task loop 完成后，加固本地 `/sdd-verify` 与 `/sdd-doctor`：

- `/sdd-verify` 从现有 run state/events/artifacts/task model 读取证据，把 validator artifact 映射到 task acceptance。
- `/sdd-doctor` 只读检查 run evidence 中的 stale delegation、terminal event 缺失、artifact 缺失或非法。
- 验证/诊断发现 gap 时只报告并生成 proposal，不自动修复、不调用外部 agent/subagent API。

## 2. 范围

- 新增 core goal-level verify：读取 `specs/<branch>/tasks.md` 中当前 task 的 acceptance / validation commands。
- 校验 reviewer / validator `sdd-result-v1` artifact 是否存在、非空、task/agent/status/path 匹配。
- 生成 `artifacts/acceptance-coverage-<task_id>.md`。
- 将 verify 结果写入 run state/events 与 `artifacts/sync-back-proposal.md`。
- 加固 doctor：遍历 `.sdd/runs/*`，检查 delegation liveness、terminal event 和 completed artifact consistency。
- 更新 CLI、tests、command docs、retained docs、phase status 和顶层索引链接。

## 3. 非目标

- 不执行 Phase 1.10 真实项目试跑。
- 不发明外部 agent/subagent API，不自动调度 Claude Code agent。
- 不执行 build/test 命令作为 validator 替代；Phase 1.9 只读取已有 validator artifact 中的证据。
- 不做 doctor auto-fix、不删除/重写 state/events/artifacts、不自动 retry。
- 不做 dashboard、run database、worktree isolation、dependency wave。
- 不覆盖顶层 `spec.md` / `plan.md` / `tasks.md` / `validation.md`，只更新索引链接。

## 4. 验收标准

- `sdd verify task <task_id> --run <run_id>` 能输出 `PASS` / `PASS_WITH_GAPS` / `FAIL` / `BLOCKED`。
- validator artifact 中未覆盖的 acceptance 会形成 verification gap，不能误判为 completed。
- verify 结果进入 acceptance coverage artifact 和 sync-back proposal。
- doctor 能报告 stale RUNNING delegation、completed 但缺 terminal event、completed 但 artifact missing/invalid、`delegation_started` without terminal event。
- `npm run typecheck`、`npm test`、`npm run build` 和新增 verify/doctor CLI smoke 通过。

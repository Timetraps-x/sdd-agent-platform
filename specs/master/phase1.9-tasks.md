# Phase 1.9 Tasks — Goal-level Verify 与 Doctor 加固

### P1.9-T1: 实现 goal-level verify runtime 与 CLI

```sdd-task
id: P1.9-T1
status: completed
wave: 1
depends_on:
  - P1.8-T1
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk:
  - runtime-state
  - validation-contract
  - command-boundary
```

#### Boundary

只从现有 task model 与 run artifacts 做 acceptance coverage verification；不调用外部 agent/subagent API，不执行 Phase 1.10 真实项目试跑。

#### Acceptance

- CLI `sdd verify task <task_id> --run <run_id>` 可运行。
- Reviewer / validator artifact contract 不合法时阻塞。
- Validator artifact 未覆盖 acceptance 时阻塞并输出 gap。
- Verify 写入 coverage artifact、state/events、sync-back proposal。

#### Implementation Notes

- 已实现 `runGoalVerify` 与 `renderGoalVerifyResult`。
- 已新增 CLI `verify task`。

### P1.9-T2: 加固 doctor run evidence 检查

```sdd-task
id: P1.9-T2
status: completed
wave: 1
depends_on:
  - P1.8-T1
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk:
  - liveness
  - artifact-contract
  - no-auto-fix
```

#### Boundary

Doctor 只读报告 stale delegation、terminal event 缺失、artifact invalid；不自动修复、不重跑、不删除状态。

#### Acceptance

- stale RUNNING delegation 被报告。
- completed delegation 缺 terminal event 被报告。
- completed delegation artifact missing/invalid 被报告。
- `delegation_started` without terminal event 被报告。

#### Implementation Notes

- 已实现 `.sdd/runs/*` 遍历与 run evidence inspection。

### P1.9-T3: 增加 tests 与文档/索引/status

```sdd-task
id: P1.9-T3
status: completed
wave: 1
depends_on:
  - P1.9-T1
  - P1.9-T2
affected_files:
  - packages/core/src/index.test.ts
  - commands/sdd-verify.md
  - commands/sdd-doctor.md
  - specs/master/phase1.9-spec.md
  - specs/master/phase1.9-plan.md
  - specs/master/phase1.9-tasks.md
  - specs/master/phase1.9-validation.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/PHASE_STATUS.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk:
  - documentation-drift
```

#### Boundary

只更新 Phase 1.9 文档与索引链接；不覆盖顶层 index body，不推进 Phase 1.10。

#### Acceptance

- Tests 覆盖 verify pass/gap 与 doctor hardening。
- Phase 1.9 retained docs 存在。
- 顶层四个 index 只新增 Phase 1.9 链接。
- PHASE_STATUS 记录 completed evidence。

#### Implementation Notes

- 测试数从 25 增至 28。

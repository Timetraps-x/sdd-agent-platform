# Phase 2.8 Tasks

### P2.8-T1: 实现 status / run inspect / sync-back core API

```sdd-task
id: P2.8-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
risk: []
```

#### Boundary

只新增 core API 与必要 helper；不接 CLI，不改 generated entries。

#### Acceptance

- `listRuns`、`inspectRun`、`getProjectStatus` 可返回结构化状态。
- `inspectSyncBack` 可只读判断 proposal 是否 ready / blocked / applied。
- `applySyncBack` 能受控写回 `tasks.md` 并更新 run state/events。

#### Implementation Notes

已实现 core API，`npm run typecheck` PASS。

### P2.8-T2: 接入 Phase 2.8 CLI 与 generated entries

```sdd-task
id: P2.8-T2
status: completed
wave: 1
depends_on:
  - P2.8-T1
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/instructions.ts
  - packages/core/src/ai-tools.ts
  - .claude/skills/sdd/SKILL.md
  - .claude/commands/sdd.md
  - .claude/commands/sdd/instructions.md
validation:
  - npm run typecheck
  - npm run build
risk: []
```

#### Boundary

接入 CLI 命令和 status-first 入口提示；不实现 Phase 2.9 的更强 Claude Code workflow automation。

#### Acceptance

- `sdd --help` 包含 Phase 2.8 新命令。
- `/sdd` 与 `/sdd:instructions` 先提示 `sdd status`。
- verify 指令明确提示 sync-back inspect/apply 且不静默写回。

#### Implementation Notes

CLI 与 generated entries 已接入并刷新，本阶段内 `npm run typecheck` 与 `npm run build` PASS。

### P2.8-T3: 补测试与验证记录

```sdd-task
id: P2.8-T3
status: completed
wave: 2
depends_on:
  - P2.8-T1
  - P2.8-T2
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phase2.8-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk: []
```

#### Boundary

补充自动化测试与 Phase 2.8 validation 记录；不对真实业务仓库执行写回 apply，除非用户明确允许。

#### Acceptance

- 覆盖 run list/inspect/status/sync-back inspect/apply/idempotence/rejection。
- 标准验证命令通过。
- 真实仓库只读 smoke 通过。

#### Implementation Notes

自动化测试已补充，覆盖 Phase 2.8 core API、CLI help、sync-back apply 幂等与拒绝路径；`npm run typecheck`、`npm test`、`npm run build` PASS。真实目标仓库只读 smoke 已执行，`sync-back apply` 未运行。

# Phase 2.9 Tasks

### P2.9-T1: 新增 Phase 2.9 retained docs 与索引

```sdd-task
id: P2.9-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - specs/master/phases/phase-2.9-claude-code-workflow-command-hardening.md
  - specs/master/phase2.9-spec.md
  - specs/master/phase2.9-plan.md
  - specs/master/phase2.9-tasks.md
  - specs/master/phase2.9-validation.md
validation:
  - manual doc review
risk: []
```

#### Boundary

新增 Phase 2.9 执行文档并更新索引；不改 runtime/CLI 行为。

#### Acceptance

- Phase 2.9 artifact 与 spec/plan/tasks/validation 文件存在。
- 顶层索引和 PHASE_STATUS 包含 Phase 2.9。
- 非目标明确排除 runtime 编排扩展。

#### Implementation Notes

本任务创建 Phase 2.9 执行边界文档。

### P2.9-T2: 强化 generated Claude Code workflow entries

```sdd-task
id: P2.9-T2
status: completed
wave: 1
depends_on:
  - P2.9-T1
affected_files:
  - packages/core/src/ai-tools.ts
  - packages/core/src/instructions.ts
  - .claude/commands/sdd.md
  - .claude/commands/sdd/do.md
  - .claude/commands/sdd/verify.md
validation:
  - npm run typecheck
  - npm run build
risk: []
```

#### Boundary

只强化 `/sdd`、`/sdd:do`、`/sdd:verify` 与 overview/do/verify instructions；不新增 runtime API 或 CLI command。

#### Acceptance

- `/sdd` 以 `sdd status` 和 recommended next command 驱动。
- `/sdd:do` 以 status + task inspect + do task 驱动。
- `/sdd:verify` 以 status + run inspect + verify + sync-back inspect 驱动。
- generated entries 明确禁止静默 `sync-back apply`。

#### Implementation Notes

已强化 `/sdd`、`/sdd:do`、`/sdd:verify` 与 overview/do/verify instruction payload；`npm run typecheck`、`npm run build` PASS，managed entries 已刷新。

### P2.9-T3: 补测试与验证记录

```sdd-task
id: P2.9-T3
status: completed
wave: 2
depends_on:
  - P2.9-T2
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phase2.9-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk: []
```

#### Boundary

补充 generated entries 与 instruction payload 自动化测试，并记录 Phase 2.9 验证；真实目标仓库只读 smoke，不写回。

#### Acceptance

- 自动化测试覆盖 Phase 2.9 entry hardening。
- 标准验证命令通过。
- 平台仓库 smoke 通过。
- 真实目标仓库只读 smoke 通过。

#### Implementation Notes

自动化测试已补充，覆盖 Phase 2.9 generated entries 与 overview/do/verify instruction payload；`npm run typecheck`、`npm test`、`npm run build` PASS。平台仓库 smoke 与真实目标仓库只读 smoke 已执行，未对真实目标仓库写入。

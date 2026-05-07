# Phase 2.10 Tasks

### P2.10-T1: Implement init semantic document scaffold

```sdd-task
id: P2.10-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
validation:
  - npm test
risk: []
```

#### Boundary

只修改 init/scaffold 相关 core 和 CLI 行为。

#### Acceptance

- init 默认生成 starter spec/plan/tasks。
- 支持 branch、skip、force/preserve 行为。

#### Implementation Notes

实现完成并通过 default/preserve/force/branch/skip 自动测试和临时目标仓库 smoke。

### P2.10-T2: Update Claude Code entries and instructions

```sdd-task
id: P2.10-T2
status: completed
wave: 1
depends_on: [P2.10-T1]
affected_files:
  - packages/core/src/ai-tools.ts
  - packages/core/src/instructions.ts
  - .claude/commands/sdd.md
  - .claude/commands/sdd/init.md
  - .claude/commands/sdd/spec.md
  - .claude/commands/sdd/plan.md
  - .claude/commands/sdd/tasks.md
validation:
  - node ./dist/packages/cli/src/main.js update --check
risk: []
```

#### Boundary

只更新 generated entry templates 和 dynamic instruction payload。

#### Acceptance

- `/sdd:init` 说明 init 生成 starter semantic docs。
- `/sdd` 遇到 ONBOARDING-1 时要求 refine existing docs，不创建平行文档。

#### Implementation Notes

Generated entries 与 dynamic instruction payload 已更新并通过 `update --check`、`instructions init --json` 验证。

### P2.10-T3: Add tests, docs, and smoke validation

```sdd-task
id: P2.10-T3
status: completed
wave: 1
depends_on: [P2.10-T1, P2.10-T2]
affected_files:
  - packages/core/src/index.test.ts
  - docs/user-guide.md
  - README.md
  - specs/master/phases/README.md
  - specs/master/phases/PHASE_STATUS.md
  - specs/master/phase2.10-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor
risk: []
```

#### Boundary

补齐测试、用户文档、phase docs 和验证记录。

#### Acceptance

- 自动测试覆盖 init scaffold 行为。
- 用户指南不再要求后续 slash command 创建初始 semantic docs。
- smoke 验证记录完成。

#### Implementation Notes

测试、用户文档、Phase 2.10 文档和 smoke 验证已完成；全局安装后的 `sdd init` 可生成 starter semantic docs。

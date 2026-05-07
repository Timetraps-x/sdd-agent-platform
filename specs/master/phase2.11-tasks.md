# Phase 2.11 Tasks

### P2.11-T1: Implement artifact template and validation UX

```sdd-task
id: P2.11-T1
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

只修改 artifact template rendering、artifact validation recommendation 和 CLI artifact UX。

#### Acceptance

- `sdd artifact template` 输出合法自引用 `sdd-result-v1` artifact。
- Validator template 包含 exact Acceptance mapping。
- `sdd artifact validate` 默认输出 human-readable report，`--json` 保留原机器可读输出。

#### Implementation Notes

已实现 core renderer、CLI command、human-readable validation report 和相关测试。

### P2.11-T2: Implement run archive and doctor scope controls

```sdd-task
id: P2.11-T2
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

只修改 run archive 状态流转、delegation terminalization 和 doctor run evidence inspection scope。

#### Acceptance

- `sdd run archive` 保留 evidence 并将 running delegation 标记为 `CANCELLED`。
- 默认 `sdd doctor` 跳过 archived runs。
- `sdd doctor --latest-only` 只检查最新非归档 run。
- `sdd doctor --all-runs` 包含 archived runs。

#### Implementation Notes

已实现 `archiveRun`、doctor options 和 CLI scope flag usage error。

### P2.11-T3: Update generated AI guidance

```sdd-task
id: P2.11-T3
status: completed
wave: 1
depends_on: [P2.11-T1, P2.11-T2]
affected_files:
  - packages/core/src/ai-tools.ts
  - packages/core/src/instructions.ts
  - .claude/commands/sdd/do.md
  - .claude/commands/sdd/verify.md
  - .claude/commands/sdd/doctor.md
validation:
  - node ./dist/packages/cli/src/main.js update --check
risk: []
```

#### Boundary

只更新 generated entry templates 和 dynamic instruction payload。

#### Acceptance

- `/sdd:do` 推荐先生成并 validate artifact。
- `/sdd:verify` 明确 validator artifact 必须包含 exact Acceptance mapping。
- `/sdd:doctor` 说明 latest-only/all-runs/archive 用法。

#### Implementation Notes

Generated entries 已通过 build 后 `sdd update` 刷新，相关 instruction tests 已更新。

### P2.11-T4: Add tests, docs, and smoke validation

```sdd-task
id: P2.11-T4
status: completed
wave: 1
depends_on: [P2.11-T1, P2.11-T2, P2.11-T3]
affected_files:
  - packages/core/src/index.test.ts
  - docs/user-guide.md
  - README.md
  - specs/master/phases/README.md
  - specs/master/phases/PHASE_STATUS.md
  - specs/master/phase2.11-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js update --check
  - node ./dist/packages/cli/src/main.js doctor --latest-only
risk: []
```

#### Boundary

补齐测试、用户文档、phase docs 和验证记录。

#### Acceptance

- 自动测试覆盖 Phase 2.11 core/CLI 行为。
- 用户指南以 `sdd artifact template` 作为 artifact 首选路径。
- Phase 2.11 完整验证记录完成。

#### Implementation Notes

测试、用户文档、Phase 2.11 文档、临时目标仓库 smoke 和全局安装 smoke 均已完成。

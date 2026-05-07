# Phase 1.7 Tasks — Claude Code Command Integration

## Tasks

### T1: 实现 lifecycle decision gate core

```sdd-task
id: P1.7-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
risk:
  - lifecycle routing
  - hard gate boundary
```

#### Boundary

只实现 Phase 1.7 command gate 决策和记录 contract；不实现 Phase 1.8 task loop，不调度 agents/workflows。

#### Acceptance

- direct whitelist 仅在所有安全条件满足时返回 direct。
- hard gates 优先于 scoring 并升级到 full/research。
- 输出 profile、confidence、reasons、required/skipped stages、checkpoint need、escalation triggers。

#### Implementation Notes

已完成。

### T2: 增加 CLI lifecycle decide 入口

```sdd-task
id: P1.7-T2
status: completed
wave: 1
depends_on:
  - P1.7-T1
affected_files:
  - packages/cli/src/main.ts
validation:
  - npm run typecheck
  - npm run sdd -- lifecycle decide --direct-safe
  - npm run sdd -- lifecycle decide --risk database --json
risk:
  - command boundary
```

#### Boundary

CLI 只收集 bounded signals、调用 core gate、输出结果、可选记录到 existing run；不执行 agents/workflows。

#### Acceptance

- 文本输出包含 profile/confidence/checkpoint/hard gates/stages/reasons/escalation/boundaries。
- JSON 输出可用于 smoke/assert。
- `--run <run_id>` 会写入 state/events。

#### Implementation Notes

已完成。

### T3: 更新 Claude Code command docs

```sdd-task
id: P1.7-T3
status: completed
wave: 2
depends_on:
  - P1.7-T1
  - P1.7-T2
affected_files:
  - commands/sdd-spec.md
  - commands/sdd-plan.md
  - commands/sdd-tasks.md
  - commands/sdd-do.md
  - commands/sdd-verify.md
  - commands/sdd-doctor.md
validation:
  - manual static review
risk:
  - command prompt bloat
```

#### Boundary

只把 placeholder 改为薄 command gate contract；不把 runtime 状态机复制进命令文档。

#### Acceptance

- 每个 `/sdd-*` 命令都声明 `sdd lifecycle decide` gate。
- `/sdd-do` 明确不实现 Phase 1.8 loop。
- `/sdd-verify` 和 `/sdd-doctor` 明确 Phase 1.9 hardening 仍未实现。

#### Implementation Notes

已完成。

### T4: 增加测试与 smoke 验证

```sdd-task
id: P1.7-T4
status: completed
wave: 2
depends_on:
  - P1.7-T1
  - P1.7-T2
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phase1.7-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk: []
```

#### Boundary

只测试 Phase 1.7 gate/recording/boundary；不测试 task implementation loop。

#### Acceptance

- direct whitelist 测试通过。
- hard gate full route 测试通过。
- checkpoint trigger 测试通过。
- research route 测试通过。
- run state/events recording 测试通过。

#### Implementation Notes

已完成。

### T5: 更新索引与阶段状态

```sdd-task
id: P1.7-T5
status: completed
wave: 3
depends_on:
  - P1.7-T3
  - P1.7-T4
affected_files:
  - README.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/PHASE_STATUS.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk: []
```

#### Boundary

只标记 Phase 1.7 完成并保持 Phase 1.8+ planned。

#### Acceptance

- README 与 top-level indexes 引用 Phase 1.7 retained docs。
- PHASE_STATUS 标记 Phase 1.7 completed。
- Phase 1.8、1.9、1.10 仍为 planned。

#### Implementation Notes

已完成。

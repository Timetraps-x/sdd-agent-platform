# Phase 3.14 Tasks

### P3.14-T1: Implement governance policy core contract

```sdd-task
id: P3.14-T1
status: completed
wave: 1
depends_on: [P3.10-T1, P3.11-T1, P3.12-T1, P3.13-T1]
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
risk: []
```

#### Boundary

实现 governance policy contract、schema、inspect/evaluate API、capability visibility、doctor contract check，并把 policy gate 接入 background/wave executor。

#### Acceptance

- Policy contract 能解释 allow/block/confirm decision。
- Background executor 遵守 delegation 并发上限。
- Wave executor 遵守 wave executor 并发和 risk gate。
- Destructive/shared-state/external/cleanup 操作默认要求显式确认。
- Doctor 能展示 governance policy contract visibility。

#### Implementation Notes

Governance policy core contract, evaluator, executor gates, capability visibility, and doctor check are complete.

### P3.14-T2: Add CLI, tests, and retained docs

```sdd-task
id: P3.14-T2
status: completed
wave: 1
depends_on: [P3.14-T1]
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.14-governance-policy.md
  - specs/master/phase3.14-spec.md
  - specs/master/phase3.14-plan.md
  - specs/master/phase3.14-tasks.md
  - specs/master/phase3.14-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js governance inspect
  - node ./dist/packages/cli/src/main.js governance evaluate background_executor --json
  - node ./dist/packages/cli/src/main.js governance evaluate destructive_git --approved --json
  - node ./dist/packages/cli/src/main.js doctor --latest-only
risk: []
```

#### Boundary

补 CLI governance inspect/evaluate、help visibility、tests、phase docs/index/status 和最终验证记录。

#### Acceptance

- CLI 能 inspect governance policy。
- CLI 能 evaluate allowed 和 confirmation-gated operations。
- Tests 覆盖 policy gate、doctor 和 CLI。
- Phase 3.14 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

CLI governance commands, test coverage, retained documentation, and final smoke validation are complete.

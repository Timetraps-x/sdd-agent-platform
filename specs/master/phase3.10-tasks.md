# Phase 3.10 Tasks

### P3.10-T1: Implement wave planner core contract

```sdd-task
id: P3.10-T1
status: completed
wave: 1
depends_on: [P3.9-T1, P3.9-T2]
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
risk: []
```

#### Boundary

实现只读 wave planner contract、wave plan API、topological waves、file overlap separation、manual/blocked gates 和 doctor visibility。

#### Acceptance

- Core 能从 task graph 和 isolation decision 生成 wave plan。
- Dependency order 被 wave 尊重。
- File overlap task 不进入同一 wave。
- Manual/blocked task 输出 reasons。
- Doctor 报告 wave planner contract visibility。

#### Implementation Notes

Wave planner core contract, topology planning, file-overlap separation, manual/blocked gates, and doctor visibility are complete.

### P3.10-T2: Add CLI, tests, and retained docs

```sdd-task
id: P3.10-T2
status: completed
wave: 1
depends_on: [P3.10-T1]
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.10-wave-planner.md
  - specs/master/phase3.10-spec.md
  - specs/master/phase3.10-plan.md
  - specs/master/phase3.10-tasks.md
  - specs/master/phase3.10-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js wave inspect --branch master
  - node ./dist/packages/cli/src/main.js wave inspect --branch master --json
risk: []
```

#### Boundary

补 CLI wave inspect、help visibility、tests、phase docs/index/status 和最终验证记录。

#### Acceptance

- CLI 能输出 human-readable 和 JSON wave plan。
- Tests 覆盖 wave order、overlap separation、manual gates、blocked diagnostics、doctor、CLI。
- Phase 3.10 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

CLI wave inspect, test coverage, and retained documentation are complete.

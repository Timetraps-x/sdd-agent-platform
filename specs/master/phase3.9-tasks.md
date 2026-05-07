# Phase 3.9 Tasks

### P3.9-T1: Implement task graph planner core contract

```sdd-task
id: P3.9-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
risk: []
```

#### Boundary

实现只读 task graph planner contract、graph plan API、cycle diagnostics、file overlap edges 和 doctor visibility。

#### Acceptance

- Core 能从 task metadata 生成 graph plan。
- Dependency edges 只连接唯一解析 task。
- Missing dependency / duplicate / ambiguous dependency / cycle 输出 blocking diagnostics。
- File overlap edge 基于 normalized affected_files 输出。
- Summary 包含 risk 和 validation 信息。

#### Implementation Notes

Task graph planner core contract, diagnostics, overlap edges, and doctor visibility are complete.

### P3.9-T2: Add CLI, tests, and retained docs

```sdd-task
id: P3.9-T2
status: completed
wave: 1
depends_on: [P3.9-T1]
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.9-task-graph-planner.md
  - specs/master/phase3.9-spec.md
  - specs/master/phase3.9-plan.md
  - specs/master/phase3.9-tasks.md
  - specs/master/phase3.9-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js graph inspect --branch master
  - node ./dist/packages/cli/src/main.js graph inspect --branch master --json
risk: []
```

#### Boundary

补 CLI graph inspect、help visibility、tests、phase docs/index/status 和最终验证记录。

#### Acceptance

- CLI 能输出 human-readable 和 JSON graph plan。
- Tests 覆盖 valid graph、cycle、missing dependency、file overlap、doctor、CLI。
- Phase 3.9 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

CLI graph inspect, test coverage, and retained documentation are complete.

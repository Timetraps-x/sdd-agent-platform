# Phase 3.13 Tasks

### P3.13-T1: Implement local run index core contract

```sdd-task
id: P3.13-T1
status: completed
wave: 1
depends_on: [P3.11-T1, P3.12-T1]
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
risk: []
```

#### Boundary

实现 local run index contract、schema、rebuild/read/query/inspect API、doctor evidence check 和 contract visibility。

#### Acceptance

- Index 能从 `.sdd/runs` 完整重建。
- Index 包含 run、task、delegation、artifact 和 wave summary。
- Query 支持 run/task/status/artifact 过滤。
- Doctor 能发现 index missing/drift 并给出 rebuild action。
- Index 不替代 state/events/artifacts 事实源。

#### Implementation Notes

Local run index core contract, rebuild/query/inspect flow, doctor drift check, and contract visibility are complete.

### P3.13-T2: Add CLI, tests, and retained docs

```sdd-task
id: P3.13-T2
status: completed
wave: 1
depends_on: [P3.13-T1]
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.13-local-run-index.md
  - specs/master/phase3.13-spec.md
  - specs/master/phase3.13-plan.md
  - specs/master/phase3.13-tasks.md
  - specs/master/phase3.13-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js run index rebuild
  - node ./dist/packages/cli/src/main.js run index inspect --json
  - node ./dist/packages/cli/src/main.js run index query --json
  - node ./dist/packages/cli/src/main.js doctor --latest-only
risk: []
```

#### Boundary

补 CLI run index rebuild/inspect/query、help visibility、tests、phase docs/index/status 和最终验证记录。

#### Acceptance

- CLI 能 rebuild、inspect、query local run index。
- Tests 覆盖 rebuild/query、doctor drift、CLI 和 help。
- Phase 3.13 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

CLI run index commands, test coverage, and retained documentation are complete.

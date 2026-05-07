# Phase 3.12 Tasks

### P3.12-T1: Implement wave executor core contract

```sdd-task
id: P3.12-T1
status: completed
wave: 1
depends_on: [P3.10-T1, P3.10-T2, P3.11-T1]
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
risk: []
```

#### Boundary

实现 wave executor contract、planner-driven execution API、strategy handling、wave events、inspection API 和 doctor visibility。

#### Acceptance

- Core 能基于 Phase 3.10 wave plan 执行 planner-safe wave tasks。
- Execution 通过 Phase 3.11 background executor 完成每个 task delegation。
- Manual/blocked/invalid plan 在执行前 blocked。
- `fast-stop` 和 `safe-continue` 策略边界明确。
- Doctor 报告 wave executor contract visibility。

#### Implementation Notes

Wave executor core contract, planner-driven execution, strategy handling, event persistence, inspection, blocked/manual handling, and doctor visibility are complete.

### P3.12-T2: Add CLI, tests, and retained docs

```sdd-task
id: P3.12-T2
status: completed
wave: 1
depends_on: [P3.12-T1]
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.12-wave-executor.md
  - specs/master/phase3.12-spec.md
  - specs/master/phase3.12-plan.md
  - specs/master/phase3.12-tasks.md
  - specs/master/phase3.12-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js wave run --run <run_id> --artifact <task_id:path> --json
  - node ./dist/packages/cli/src/main.js wave executor <run_id> --json
risk: []
```

#### Boundary

补 CLI wave run/executor inspect、help visibility、tests、phase docs/index/status 和最终验证记录。

#### Acceptance

- CLI 能执行 wave run 并 inspect wave execution evidence。
- Tests 覆盖 completed wave、manual/blocked gates、safe-continue boundary、doctor、CLI。
- Phase 3.12 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

CLI wave run/executor inspect, test coverage, and retained documentation are complete.

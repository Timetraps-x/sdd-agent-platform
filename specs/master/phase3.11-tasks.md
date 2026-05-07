# Phase 3.11 Tasks

### P3.11-T1: Implement background executor core contract

```sdd-task
id: P3.11-T1
status: completed
wave: 1
depends_on: [P3.10-T1, P3.10-T2]
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
risk: []
```

#### Boundary

实现单 task background executor contract、claim/run/ingest API、inspection API、manual/blocked gate handling 和 doctor visibility。

#### Acceptance

- Core 能 claim 一个 background delegation。
- Run/delegation state 和 events 可审计。
- 有 artifact 时通过 artifact ingestion 进入 terminal state。
- Invalid/manual/blocked path 产生明确 issues。
- Doctor 报告 background executor contract visibility。

#### Implementation Notes

Background executor core contract, claim/run/ingest flow, inspection, run-state persistence, blocked/manual handling, and doctor visibility are complete.

### P3.11-T2: Add CLI, tests, and retained docs

```sdd-task
id: P3.11-T2
status: completed
wave: 1
depends_on: [P3.11-T1]
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.11-background-executor.md
  - specs/master/phase3.11-spec.md
  - specs/master/phase3.11-plan.md
  - specs/master/phase3.11-tasks.md
  - specs/master/phase3.11-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js background run ONBOARDING-1 --json
  - node ./dist/packages/cli/src/main.js background inspect <run_id> --json
risk: []
```

#### Boundary

补 CLI background run/inspect、help visibility、tests、phase docs/index/status 和最终验证记录。

#### Acceptance

- CLI 能 claim background delegation 并 inspect evidence。
- Tests 覆盖 claim、valid artifact terminal ingestion、invalid artifact blocked、manual handoff worker blocked、doctor、CLI。
- Phase 3.11 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

CLI background run/inspect, test coverage, and retained documentation are complete.

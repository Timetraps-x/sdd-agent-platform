# Phase 3.6 Tasks

### P3.6-T1: Implement artifact result ingestion core and CLI

```sdd-task
id: P3.6-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
validation:
  - npm run typecheck
  - npm test
risk: []
```

#### Boundary

只实现 artifact result ingestion ledger、delegation 状态映射、doctor consistency 和 CLI 可见性。

#### Acceptance

- Core 能 ingest 已存在的 run-relative artifact。
- Valid artifact 写入 accepted record、artifact index、delegation terminal status 和 terminal event。
- Invalid artifact 写入 rejected record，不污染 accepted evidence。
- Duplicate ingestion 幂等。
- CLI 能 ingest/inspect artifact ingestions。
- Doctor 能发现 ingestion/state/artifact index 不一致。

#### Implementation Notes

Artifact result ingestion API, ledger, CLI commands, run inspect visibility, and doctor consistency checks are complete.

### P3.6-T2: Add tests and retained docs

```sdd-task
id: P3.6-T2
status: completed
wave: 1
depends_on: [P3.6-T1]
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.6-artifact-result-ingestion.md
  - specs/master/phase3.6-spec.md
  - specs/master/phase3.6-plan.md
  - specs/master/phase3.6-tasks.md
  - specs/master/phase3.6-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js artifact ingestions <run_id>
risk: []
```

#### Boundary

补测试、索引和验证记录。

#### Acceptance

- Tests 覆盖 valid/invalid/duplicate/doctor mismatch/CLI help。
- Phase 3.6 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

Tests and retained documentation are complete.

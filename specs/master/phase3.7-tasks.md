# Phase 3.7 Tasks

### P3.7-T1: Implement worktree isolation dry-run contract

```sdd-task
id: P3.7-T1
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

只实现 worktree isolation decision contract、dry-run API、CLI inspect 和 doctor visibility。

#### Acceptance

- Core 能基于 task/capability/peer overlap 输出 isolation decision。
- Writable overlap 返回 blocked 且 safeConcurrency=false。
- Read-only capability 返回 none。
- High-risk writable task 返回 required 或 manual。
- CLI 能 inspect isolation decision。
- Doctor 能报告 isolation contract visibility。

#### Implementation Notes

Worktree isolation dry-run contract, CLI inspect command, and doctor visibility are complete.

### P3.7-T2: Add tests and retained docs

```sdd-task
id: P3.7-T2
status: completed
wave: 1
depends_on: [P3.7-T1]
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.7-worktree-isolation-contract.md
  - specs/master/phase3.7-spec.md
  - specs/master/phase3.7-plan.md
  - specs/master/phase3.7-tasks.md
  - specs/master/phase3.7-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js isolation inspect P3.7-T1 --peer-task P3.7-T2
risk: []
```

#### Boundary

补测试、索引和验证记录。

#### Acceptance

- Tests 覆盖 writable overlap/read-only/high-risk/doctor/CLI help。
- Phase 3.7 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

Tests and retained documentation are complete.

# Phase 3.8 Tasks

### P3.8-T1: Implement worktree lifecycle core contract

```sdd-task
id: P3.8-T1
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

实现 worktree lifecycle types、run state records、create/inspect/keep/remove API、events 和 doctor visibility。

#### Acceptance

- Run state 能记录 worktree 与 run/task 绑定。
- Create 使用 Phase 3.7 isolation decision gate。
- Inspect 能发现 missing/orphan/dirty/duplicate/stale lifecycle state。
- Remove 拒绝 dirty worktree。
- Keep 能保留 worktree 并记录 reason。
- Lifecycle events 可审计。

#### Implementation Notes

Worktree lifecycle core contract, state records, safety gates, event auditing, and doctor integration are complete.

### P3.8-T2: Add CLI, tests, and retained docs

```sdd-task
id: P3.8-T2
status: completed
wave: 1
depends_on: [P3.8-T1]
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
  - specs/master/phases/phase-3.8-worktree-lifecycle-manager.md
  - specs/master/phase3.8-spec.md
  - specs/master/phase3.8-plan.md
  - specs/master/phase3.8-tasks.md
  - specs/master/phase3.8-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - node ./dist/packages/cli/src/main.js doctor --latest-only
  - node ./dist/packages/cli/src/main.js worktree inspect 20260507-003 --json
risk: []
```

#### Boundary

补 CLI lifecycle commands、help visibility、tests、phase docs/index/status 和最终验证记录。

#### Acceptance

- CLI 能 create/inspect/keep/remove worktree lifecycle。
- Tests 覆盖 clean remove、dirty refusal、keep、doctor、CLI smoke。
- Phase 3.8 docs/indexes 更新。
- 验证记录完成。

#### Implementation Notes

CLI commands, test coverage, and retained documentation are complete.

# Phase 3.0 Tasks

### P3.0-T1: Define Phase 3 platform extension baseline

```sdd-task
id: P3.0-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - specs/master/phases/phase-3.0-platform-extension-baseline.md
  - specs/master/phase3.0-spec.md
  - specs/master/phase3.0-plan.md
  - specs/master/phase3.0-tasks.md
  - specs/master/phase3.0-validation.md
validation:
  - node ./dist/packages/cli/src/main.js tasks gaps --branch master
  - node ./dist/packages/cli/src/main.js doctor --latest-only
risk: []
```

#### Boundary

只定义 Phase 3.0 的平台化扩展边界、子阶段顺序和索引，不实现 Phase 3.1+ runtime code。

#### Acceptance

- Phase 3.0 retained docs 存在。
- Phase 3 子阶段顺序明确。
- Phase 3.1 明确以 tool/capability registry baseline 为 first implementation target。
- Phase 3.0 不实现 background write、worktree、dependency wave、plugin loader 或 dashboard/run DB。

#### Implementation Notes

Phase 3.0 baseline docs and indexes are complete; `tasks gaps --branch master` and `doctor --latest-only` passed.

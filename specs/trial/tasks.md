# Trial Tasks

### P1.10-T1: 验证 Phase 1.10 CLI 闭环

```sdd-task
id: P1.10-T1
status: pending
wave: 1
depends_on: []
affected_files:
  - specs/trial/spec.md
  - specs/trial/plan.md
  - specs/trial/tasks.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk:
  - trial-only
  - sync-back-proposal-only
```

#### Boundary

只验证 Phase 1.10 试跑链路和 artifact contract；不得自动 commit/push/PR，不得调用外部 agent API，不得自动写回 tasks.md。

#### Acceptance

- CLI 可以记录 full profile lifecycle decision 到 run state/events。
- CLI 可以解析 trial branch 的 sdd-task metadata。
- 单 task loop 可以接受 reviewer/validator artifacts 并生成 sync-back proposal。
- Goal-level verify 可以把 validator evidence 映射到全部 acceptance。
- Doctor 可以只读发现当前历史 run 中的 liveness/artifact gaps，且不 auto-fix。

#### Implementation Notes

Phase 1.10 trial 结束后只生成 sync-back proposal；是否写回本文件留给显式后续决策。

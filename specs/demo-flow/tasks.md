# Demo Flow Tasks

### DEMO-T1: 演示完整 SDD workflow

```sdd-task
id: DEMO-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - specs/demo-flow/tasks.md
validation:
  - node ./dist/packages/cli/src/main.js status --branch demo-flow
risk: []
```

#### Boundary

只验证 SDD workflow 的状态流转和 artifact/sync-back 机制；不修改平台功能代码。

#### Acceptance

- Demo artifacts use `sdd-result-v1` and are accepted by the runtime.
- `sdd do task` completes for DEMO-T1.
- `sdd verify task` produces PASS acceptance coverage.
- `sdd sync-back inspect` reports ready before apply.
- `sdd sync-back apply` marks this task completed.

#### Implementation Notes

待 sync-back 写回。
- Sync-back applied from run `20260506-001` (2026-05-06T08:52:00.551Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-DEMO-T1.md`, `artifacts/validation-DEMO-T1.md`, `artifacts/acceptance-coverage-DEMO-T1.md`.
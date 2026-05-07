# Phase 1.10 Tasks — 真实项目验收试跑

### P1.10-D1: 建立 trial SDD 文档

```sdd-task
id: P1.10-D1
status: completed
wave: 1
depends_on: []
affected_files:
  - specs/trial/spec.md
  - specs/trial/plan.md
  - specs/trial/tasks.md
validation:
  - npm run sdd -- tasks gaps --branch trial
risk:
  - trial-docs
```

#### Boundary

只创建 trial SDD 文档；不修改 Phase 1.0~1.9 上游事实源。

#### Acceptance

- `specs/trial/tasks.md` 包含 `P1.10-T1` 的 `sdd-task` block。
- `tasks gaps --branch trial` 返回 PASS。

#### Implementation Notes

已完成，task parser 输出 `gaps=0`。

### P1.10-D2: 执行平台验证命令

```sdd-task
id: P1.10-D2
status: completed
wave: 1
depends_on:
  - P1.10-D1
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk:
  - build-validation
```

#### Boundary

只运行验证，不为非 blocker 做实现修改。

#### Acceptance

- Typecheck PASS。
- Tests PASS。
- Build PASS。

#### Implementation Notes

已完成，28 个 Node test 全部通过。

### P1.10-D3: 执行 CLI trial 闭环

```sdd-task
id: P1.10-D3
status: completed
wave: 2
depends_on:
  - P1.10-D1
  - P1.10-D2
affected_files:
  - .sdd/runs/20260501-020/state.json
  - .sdd/runs/20260501-020/events.jsonl
  - .sdd/runs/20260501-020/artifacts/review-P1.10-T1.md
  - .sdd/runs/20260501-020/artifacts/validation-P1.10-T1.md
  - .sdd/runs/20260501-020/artifacts/acceptance-coverage-P1.10-T1.md
  - .sdd/runs/20260501-020/artifacts/sync-back-proposal.md
validation:
  - npm run sdd -- do task P1.10-T1 --branch trial --run 20260501-020 --review-artifact artifacts/review-P1.10-T1.md --validation-artifact artifacts/validation-P1.10-T1.md
  - npm run sdd -- verify task P1.10-T1 --branch trial --run 20260501-020 --review-artifact artifacts/review-P1.10-T1.md --validation-artifact artifacts/validation-P1.10-T1.md
risk:
  - runtime-state
  - artifact-contract
```

#### Boundary

不调用外部 agent API；reviewer/validator 使用本地预置 artifact；sync-back 保持 proposal。

#### Acceptance

- Run `20260501-020` status completed / verify PASS。
- Single-task loop completed with no gaps。
- Goal verify PASS with acceptance coverage artifact。

#### Implementation Notes

已完成。中间 run `20260501-019` 暴露 artifact contract 写法错误后，创建 clean run `20260501-020` 重跑通过。

### P1.10-D4: 记录 doctor gap 与 Phase 1.10 checkpoint

```sdd-task
id: P1.10-D4
status: completed
wave: 3
depends_on:
  - P1.10-D3
affected_files:
  - specs/master/phase1.10-validation.md
  - specs/master/phases/PHASE_STATUS.md
validation:
  - npm run sdd -- doctor
risk:
  - doctor-gap-report
```

#### Boundary

Doctor 只读报告，不 auto-fix 历史 smoke run gaps。

#### Acceptance

- Doctor 输出 FAIL 但失败来自历史 run/smoke liveness 与 missing state/artifact gaps。
- Trial run `20260501-020` 自身没有新增 doctor failure。
- Phase 1.10 validation 文档记录限制与 gap report。

#### Implementation Notes

已完成；doctor 输出作为 Phase 2 readiness / housekeeping gap 记录，不阻塞 `20260501-020` trial PASS。

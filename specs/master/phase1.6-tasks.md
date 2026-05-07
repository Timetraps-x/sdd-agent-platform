# Phase 1.6 Tasks — Artifact / Delegation Contract

## Tasks

### T1: 实现 artifact path helper 与 sdd-result parser

```sdd-task
id: P1.6-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
risk:
  - artifact path boundary
```

#### Boundary

只实现 artifact helper、`sdd-result` block 解析和 contract validation；不执行 agent、不接入 command gate、不实现 single task loop。

#### Acceptance

- 合法 `sdd-result` 能解析为结构化 result。
- 缺失 required field 或非法 status 会返回 contract issue。
- Artifact path helper 区分 artifact-root-relative 与 run-relative form。
- 目录逃逸和错误 path scope 被拒绝。

#### Implementation Notes

已完成。

### T2: 实现 delegation liveness contract checks

```sdd-task
id: P1.6-T2
status: completed
wave: 1
depends_on:
  - P1.6-T1
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
  - npm test
risk:
  - liveness state semantics
```

#### Boundary

只表示和校验 delegation record；不启动 subagent、不管理后台进程、不实现 retry/supervisor。

#### Acceptance

- `RUNNING` 不被视为 terminal。
- stale RUNNING 能返回明确 issue。
- terminal delegation 缺失 terminal event timestamp 能返回 issue。
- COMPLETED delegation 会校验 expected artifact 的 `sdd-result`。

#### Implementation Notes

已完成。

### T3: 增加只读 artifact validation CLI

```sdd-task
id: P1.6-T3
status: completed
wave: 2
depends_on:
  - P1.6-T1
affected_files:
  - packages/cli/src/main.ts
validation:
  - npm run typecheck
  - node dist/packages/cli/src/main.js artifact validate <run_id> artifacts/<file>
risk:
  - phase boundary
```

#### Boundary

CLI 只调用 artifact contract validation 并输出 JSON report；不接入 Claude Code slash command，不执行 lifecycle decision gate，不调度 task。

#### Acceptance

- 合法 artifact 返回 exit code 0。
- invalid artifact 返回 exit code 1 和 issues。
- 缺少参数返回 usage 和 exit code 2。

#### Implementation Notes

已完成。

### T4: 增加测试与验证证据

```sdd-task
id: P1.6-T4
status: completed
wave: 2
depends_on:
  - P1.6-T1
  - P1.6-T2
  - P1.6-T3
affected_files:
  - packages/core/src/index.test.ts
  - specs/master/phase1.6-validation.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk: []
```

#### Boundary

只覆盖 Phase 1.6 contract validation cases，不增加 Phase 1.7+ lifecycle/command/loop 测试。

#### Acceptance

- sdd-result happy path 测试通过。
- missing/empty/task mismatch artifact 测试通过。
- artifact path canonicalization 测试通过。
- delegation terminal/stale contract checks 测试通过。

#### Implementation Notes

已完成。

### T5: 更新文档、索引和状态

```sdd-task
id: P1.6-T5
status: completed
wave: 3
depends_on:
  - P1.6-T4
affected_files:
  - README.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phase1.6-spec.md
  - specs/master/phase1.6-plan.md
  - specs/master/phase1.6-tasks.md
  - specs/master/phase1.6-validation.md
  - specs/master/phases/PHASE_STATUS.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
risk: []
```

#### Boundary

只同步 Phase 1.6 retained docs、索引、README 和 phase status；Phase 1.7+ 保持 planned。

#### Acceptance

- Phase 1.6 retained short docs 存在。
- README 和 top-level indexes 引用 Phase 1.6 retained docs。
- Validation evidence 写入后，`PHASE_STATUS.md` 将 Phase 1.6 标为 completed。
- Phase 1.7、1.8、1.9、1.10 仍为 planned。

#### Implementation Notes

已完成。

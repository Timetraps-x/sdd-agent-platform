# Phase 1.2 Runtime 骨架 Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-1.2-runtime-skeleton.md` 的执行 tasks。

Phase 1.2 完成并验证后，Phase 1.3 static contract assets 才可开始。

## Task List

### P1.2-T1: 建立 core runtime spine

```sdd-task
id: P1.2-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/package.json
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm run typecheck
  - npm test
risk:
  - core 过早承载 command gate
  - state/events contract 与架构基线漂移
```

#### Boundary

只实现 project config、run state、event log、artifact path、doctor 的 Phase 1.2 最小能力。

#### Acceptance

- core 能写入/读取 `.sdd/project.yml`。
- core 能创建 run state、append events、解析 artifact path。
- lifecycle decision placeholder 字段存在但不执行 routing。
- tests 覆盖基础行为。

---

### P1.2-T2: 建立 thin CLI skeleton

```sdd-task
id: P1.2-T2
status: completed
wave: 1
depends_on:
  - P1.2-T1
affected_files:
  - packages/cli/package.json
  - packages/cli/src/main.ts
validation:
  - npm run sdd -- init
  - npm run sdd -- doctor
  - npm run sdd -- run create
  - npm run sdd -- run status 20260501-001
risk:
  - CLI 复制领域状态机
  - 命令入口提前实现 Phase 1.7 行为
```

#### Boundary

CLI 只做命令分发、参数处理和输出，所有 runtime 事实逻辑调用 core。

#### Acceptance

- `init`、`doctor`、`run create`、`run status` 可用。
- CLI smoke 能生成 `.sdd/project.yml` 和 `.sdd/runs/<run_id>`。

---

### P1.2-T3: 固化 Phase 1.2 runtime contracts

```sdd-task
id: P1.2-T3
status: completed
wave: 2
depends_on:
  - P1.2-T1
affected_files:
  - schemas/phase-1.2-project-contract.md
  - schemas/phase-1.2-run-state-contract.md
  - schemas/phase-1.2-event-log-contract.md
  - schemas/phase-1.2-artifact-path-contract.md
  - schemas/phase-1.2-lifecycle-decision-contract.md
validation:
  - manual-doc-review
risk:
  - 提前实现 Phase 1.3 contract pack
  - contract 缺少 owner/storage/writer/reader
```

#### Boundary

只记录 Phase 1.2 已实现/预留的 contract，不创建模板、adapter pack 或 artifact validator schema。

#### Acceptance

- project、run state、event log、artifact path、lifecycle decision contract 均有 contract id 和 owner/storage/writer/reader。

---

### P1.2-T4: 更新 TypeScript package configuration

```sdd-task
id: P1.2-T4
status: completed
wave: 2
depends_on:
  - P1.2-T1
  - P1.2-T2
affected_files:
  - package.json
  - package-lock.json
  - tsconfig.json
validation:
  - npm install
  - npm run typecheck
  - npm test
risk:
  - 依赖和脚本超出 Phase 1.2 所需
```

#### Boundary

只新增 TypeScript runtime/test 必需依赖和脚本。

#### Acceptance

- `npm run typecheck` 通过。
- `npm test` 通过。
- `npm run sdd -- ...` 可执行 CLI。

---

### P1.2-T5: 生成 runtime smoke evidence

```sdd-task
id: P1.2-T5
status: completed
wave: 3
depends_on:
  - P1.2-T1
  - P1.2-T2
  - P1.2-T4
affected_files:
  - .sdd/project.yml
  - .sdd/runs/20260501-001/state.json
  - .sdd/runs/20260501-001/events.jsonl
validation:
  - npm run sdd -- init
  - npm run sdd -- doctor
  - npm run sdd -- run create
  - npm run sdd -- run status 20260501-001
risk:
  - 重复执行破坏已有 run
  - 写入范围逃逸 .sdd
```

#### Boundary

只生成当前仓库 Phase 1.2 smoke evidence，不执行真实 SDD workflow。

#### Acceptance

- `.sdd/project.yml` 存在。
- run state 包含 lifecycle decision placeholder。
- event log 包含 `run_started` 与 `lifecycle_decision_recorded`。

---

### P1.2-T6: 更新执行文档、索引和状态

```sdd-task
id: P1.2-T6
status: completed
wave: 4
depends_on:
  - P1.2-T1
  - P1.2-T2
  - P1.2-T3
  - P1.2-T4
  - P1.2-T5
affected_files:
  - specs/master/phase1.2-spec.md
  - specs/master/phase1.2-plan.md
  - specs/master/phase1.2-tasks.md
  - specs/master/phase1.2-validation.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/PHASE_STATUS.md
  - README.md
validation:
  - manual-doc-review
risk:
  - 未写验证证据就标记 completed
  - 索引遗漏 Phase 1.2 文档
```

#### Boundary

只更新 Phase 1.2 执行文档、索引和状态，不提交 git。

#### Acceptance

- Phase 1.2 execution docs 使用短命名留存。
- README 和 SDD 索引包含 Phase 1.2。
- `phase1.2-validation.md` 写入验证证据。
- `PHASE_STATUS.md` 在验证证据存在后标记 Phase 1.2 completed。

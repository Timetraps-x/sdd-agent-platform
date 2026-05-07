# Phase 1.3 Tasks - Contract / Templates / Adapters Pack

## Contract Header

- phase: `1.3`
- phase artifact: `specs/master/phases/phase-1.3-contract-templates-adapters.md`
- status: `completed`

## Tasks

### T1: 固化 Phase 1.3 contract 文档

```sdd-task
id: P1.3-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - schemas/contracts/project-yml-contract.md
  - schemas/contracts/run-state-contract.md
  - schemas/contracts/event-log-contract.md
  - schemas/contracts/lifecycle-decision-contract.md
  - schemas/contracts/sdd-task-contract.md
  - schemas/contracts/sdd-result-contract.md
  - schemas/contracts/delegation-liveness-contract.md
  - schemas/contracts/doctor-static-assets-contract.md
validation:
  - manual static contract review
risk:
  - contract drift
  - downstream parser ambiguity
```

#### Boundary

只定义静态 contract，不实现 parser、validator、runtime liveness 或 command gate。

#### Acceptance

- Contract 文件均包含 id/version/owner/writer/reader/extension points。
- Contract 字段覆盖 Phase 1.3 artifact 要求。

### T2: 创建模板资产

```sdd-task
id: P1.3-T2
status: completed
wave: 1
depends_on:
  - P1.3-T1
affected_files:
  - templates/spec-template.md
  - templates/plan-template.md
  - templates/tasks-template.md
  - templates/project-template.yml
  - templates/sync-back-proposal-template.md
validation:
  - manual template metadata review
risk:
  - parser compatibility
```

#### Boundary

模板提供结构和示例占位，不生成真实项目文档，不实现命令。

#### Acceptance

- 每个模板包含 template id/version。
- `tasks-template.md` 包含可解析的 `sdd-task` fenced block。
- sync-back 模板只表达 proposal，不自动写回。

### T3: 创建 adapter 资产

```sdd-task
id: P1.3-T3
status: completed
wave: 1
depends_on:
  - P1.3-T1
affected_files:
  - adapters/generic.yml
  - adapters/java-maven.yml
validation:
  - manual adapter contract review
risk:
  - validation command overreach
```

#### Boundary

adapter 只声明项目类型、目录、验证命令和运行边界，不执行验证、不加载 plugin。

#### Acceptance

- adapter 包含 contract/version/id。
- `java-maven.yml` 声明 Maven 默认验证命令。
- 两个 adapter 均声明 Phase 1 禁止 background write/worktree isolation。

### T4: 同步索引、README、状态与验证证据

```sdd-task
id: P1.3-T4
status: completed
wave: 2
depends_on:
  - P1.3-T1
  - P1.3-T2
  - P1.3-T3
affected_files:
  - README.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/PHASE_STATUS.md
  - specs/master/phase1.3-validation.md
validation:
  - asset existence and identifier review
risk:
  - premature phase completion
```

#### Boundary

只有验证证据写入后才能把 Phase 1.3 状态标为 completed。

#### Acceptance

- 索引包含 Phase 1.3 执行文档。
- `PHASE_STATUS.md` completion evidence 指向实际产物和 validation 文档。

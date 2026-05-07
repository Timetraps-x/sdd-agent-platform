# Phase 2.5 Detector Registry 与 Mixed Stack 识别 Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-2.5-detector-registry.md` 的执行 tasks。

## Task List

### P2.5-T1: 定义 detector model

```sdd-task
id: P2.5-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
risk:
  - detection contract 不可扩展
```

#### Boundary

只定义本地 evidence model，不引入外部分析。

#### Acceptance

- 存在 confidence/evidence/candidate model。

---

### P2.5-T2: 迁移 Java/Node detector

```sdd-task
id: P2.5-T2
status: completed
wave: 1
depends_on:
  - P2.5-T1
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test
risk:
  - Maven multi-module 行为回退
```

#### Boundary

保留 Phase 1 Java/Node 识别能力。

#### Acceptance

- Maven multi-module test 仍通过。

---

### P2.5-T3: 输出 mixed-stack detection section

```sdd-task
id: P2.5-T3
status: completed
wave: 2
depends_on:
  - P2.5-T2
affected_files:
  - packages/core/src/index.ts
  - packages/core/src/index.test.ts
validation:
  - npm test
risk:
  - 混合仓库被 package.json 误判为 Node primary
```

#### Boundary

只输出 detection metadata，不改变 validation command 执行。

#### Acceptance

- mixed repo test primary 为 Java，且 candidates 包含 TypeScript Node。

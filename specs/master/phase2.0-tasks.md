# Phase 2.0 AI 工具入口投影执行基线 Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-2.0-ai-tool-entry-projection.md` 的执行 tasks。

Phase 2.0 完成并验证后，Phase 2.1 全局 CLI 安装与 package/bin 硬化才可开始。

## Task List

### P2.0-T1: 拆分 Phase 2 小阶段

```sdd-task
id: P2.0-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - specs/master/phases/phase-2.1-global-cli-install.md
  - specs/master/phases/phase-2.2-ai-tool-adapter-registry.md
  - specs/master/phases/phase-2.3-init-update-generated-entries.md
  - specs/master/phases/phase-2.4-instruction-api-thin-entries.md
  - specs/master/phases/phase-2.5-detector-registry.md
  - specs/master/phases/phase-2.6-doctor-drift-check.md
  - specs/master/phases/phase-2.7-entry-projection-e2e.md
validation:
  - manual-doc-review
risk:
  - Phase 2 范围过粗导致实现不可控
  - phase 依赖倒置
```

#### Boundary

只创建 phase artifact，不实现代码。

#### Acceptance

- Phase 2.1~2.7 artifact 均存在。
- 每个 artifact 都有定位、依赖、范围、非目标、交付物、验收标准、下游引用。

---

### P2.0-T2: 固化安装与 init 产物 contract

```sdd-task
id: P2.0-T2
status: completed
wave: 1
depends_on:
  - P2.0-T1
affected_files:
  - specs/master/phase2.0-spec.md
  - specs/master/phase2.0-plan.md
validation:
  - manual-doc-review
risk:
  - 安装地址不清导致 E2E 不可复现
  - init 生成产物不稳定
```

#### Boundary

只定义 contract，不修改 package 或 CLI。

#### Acceptance

- 明确 local dist、npm link、npm pack tarball 三种安装验证形态。
- 明确 `.sdd` 与 `.claude` generated entries 的目标路径。

---

### P2.0-T3: 固化 generated entry 与 drift 规则

```sdd-task
id: P2.0-T3
status: completed
wave: 2
depends_on:
  - P2.0-T1
affected_files:
  - specs/master/phase2.0-spec.md
  - specs/master/phase2.0-plan.md
validation:
  - manual-doc-review
risk:
  - 覆盖用户手写 Claude 文件
  - generated entry 变成大 prompt
```

#### Boundary

只定义 metadata、hash、foreign conflict 和 thin entry 原则。

#### Acceptance

- 明确 `sdd-ai-entry-v1` metadata 字段。
- 明确 managed/missing/drifted/foreign 的处理规则。
- 明确 generated entry 通过 `sdd instructions <action> --json` 获取动态指令。

---

### P2.0-T4: 固化 update/doctor/instructions/detector/E2E 归属

```sdd-task
id: P2.0-T4
status: completed
wave: 2
depends_on:
  - P2.0-T1
  - P2.0-T2
  - P2.0-T3
affected_files:
  - specs/master/phase2.0-spec.md
  - specs/master/phase2.0-plan.md
validation:
  - manual-doc-review
risk:
  - update 与 doctor 职责混杂
  - detector registry 继续停留在内联 if/score
```

#### Boundary

只定义每项能力进入哪个小阶段，不实现代码。

#### Acceptance

- `sdd update` 归属 Phase 2.3。
- instruction API 归属 Phase 2.4。
- detector registry 归属 Phase 2.5。
- doctor drift check 归属 Phase 2.6。
- install/init/trigger/update/doctor/uninstall E2E 归属 Phase 2.7。

---

### P2.0-T5: 更新索引和状态

```sdd-task
id: P2.0-T5
status: completed
wave: 3
depends_on:
  - P2.0-T1
  - P2.0-T2
  - P2.0-T3
  - P2.0-T4
affected_files:
  - specs/master/phase2.0-spec.md
  - specs/master/phase2.0-plan.md
  - specs/master/phase2.0-tasks.md
  - specs/master/phase2.0-validation.md
  - specs/master/spec.md
  - specs/master/plan.md
  - specs/master/tasks.md
  - specs/master/validation.md
  - specs/master/phases/README.md
  - specs/master/phases/PHASE_STATUS.md
validation:
  - manual-doc-review
risk:
  - 索引遗漏导致后续 phase 找不到 retained docs
  - 未验证就标记 completed
```

#### Boundary

只更新文档索引和 phase status，不提交 git。

#### Acceptance

- 顶层 spec/plan/tasks/validation 索引包含 Phase 2.0。
- phase README 和 status 包含 Phase 2.0~2.7。
- `phase2.0-validation.md` 写入验证证据后，PHASE_STATUS 可将 Phase 2.0 标记为 completed。

# Phase 2.6 Doctor Drift Check 与 Update Check 模式 Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-2.6-doctor-drift-check.md` 的执行 tasks。

## Task List

### P2.6-T1: doctor 接入 AI entry drift

```sdd-task
id: P2.6-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
validation:
  - npm run typecheck
risk:
  - doctor 与 update --check 语义分叉
```

#### Boundary

doctor 只读，不自动修复。

#### Acceptance

- doctor 使用 `checkAiToolEntryDrift`。

---

### P2.6-T2: status 到 DoctorCheck 映射

```sdd-task
id: P2.6-T2
status: completed
wave: 1
depends_on:
  - P2.6-T1
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test
risk:
  - drift/missing 被误标为 WARN
```

#### Boundary

只映射 AI entry 状态，不改变 run evidence doctor 规则。

#### Acceptance

- drift/missing 为 FAIL。

---

### P2.6-T3: drift doctor 测试与 smoke

```sdd-task
id: P2.6-T3
status: completed
wave: 2
depends_on:
  - P2.6-T2
affected_files:
  - packages/core/src/index.test.ts
validation:
  - npm test
  - temp target repo doctor
risk:
  - check-only 场景不稳定
```

#### Boundary

真实目标仓库只读 smoke，不运行 update 写入。

#### Acceptance

- 测试中 drift 后 doctor 返回 FAIL。
- 真实目标仓库 missing entries 被 doctor 报告。

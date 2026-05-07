# Phase 2.3 Init / Update Generated Entries 闭环 Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-2.3-init-update-generated-entries.md` 的执行 tasks。

## Task List

### P2.3-T1: 接入 init projection

```sdd-task
id: P2.3-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
validation:
  - npm test
risk:
  - init 产物不完整
```

#### Boundary

只生成 managed AI entries；不覆盖 foreign files。

#### Acceptance

- init 创建 Claude Code skill/command entries。

---

### P2.3-T2: 新增 update/check CLI

```sdd-task
id: P2.3-T2
status: completed
wave: 1
depends_on:
  - P2.3-T1
affected_files:
  - packages/cli/src/main.ts
  - packages/core/src/ai-tools.ts
validation:
  - npm test
risk:
  - check 模式误写文件
```

#### Boundary

`--check` 只读不写。

#### Acceptance

- drift 时 `update --check` 返回 FAIL JSON。
- `update` 修复 managed drift。

---

### P2.3-T3: 验证 foreign 保护

```sdd-task
id: P2.3-T3
status: completed
wave: 2
depends_on:
  - P2.3-T2
affected_files:
  - packages/core/src/index.test.ts
validation:
  - npm test
risk:
  - 覆盖用户手写 command
```

#### Boundary

foreign 文件只报告。

#### Acceptance

- 测试确认 user-owned command 内容不变。

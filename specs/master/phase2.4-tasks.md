# Phase 2.4 Instruction API 与薄入口改造 Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-2.4-instruction-api-thin-entries.md` 的执行 tasks。

## Task List

### P2.4-T1: 新增 instruction contract

```sdd-task
id: P2.4-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/instructions.ts
  - packages/core/src/index.ts
validation:
  - npm test
risk:
  - generated entries 缺少动态边界来源
```

#### Boundary

只返回指令 payload，不执行指令。

#### Acceptance

- payload contract 为 `sdd-instructions-v1`。

---

### P2.4-T2: 接入 CLI instructions command

```sdd-task
id: P2.4-T2
status: completed
wave: 1
depends_on:
  - P2.4-T1
affected_files:
  - packages/cli/src/main.ts
validation:
  - node ./dist/packages/cli/src/main.js instructions --json
risk:
  - action 解析错误导致默认 overview 不可用
```

#### Boundary

CLI 只打印文本或 JSON。

#### Acceptance

- `sdd instructions --json` 返回 overview JSON。

---

### P2.4-T3: 保持 generated entries 薄入口

```sdd-task
id: P2.4-T3
status: completed
wave: 2
depends_on:
  - P2.4-T2
affected_files:
  - packages/core/src/ai-tools.ts
validation:
  - npm test
risk:
  - generated markdown 退化为大 prompt
```

#### Boundary

entry body 只说明调用 CLI/core instructions。

#### Acceptance

- generated skill/command 包含 `sdd instructions ... --json`。

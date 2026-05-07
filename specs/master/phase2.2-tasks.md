# Phase 2.2 AI Tool Adapter Registry 与 Claude Code Adapter Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-2.2-ai-tool-adapter-registry.md` 的执行 tasks。

## Task List

### P2.2-T1: 新增 AI tool adapter registry

```sdd-task
id: P2.2-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/core/src/ai-tools.ts
  - packages/core/src/index.ts
validation:
  - npm run typecheck
risk:
  - adapter contract 不稳定导致后续 init/update 难以复用
```

#### Boundary

只实现 registry 与 Claude Code adapter，不实现其他工具。

#### Acceptance

- `getAiToolAdapters('auto')` 可返回 Claude Code adapter。

---

### P2.2-T2: 实现 metadata/hash/drift

```sdd-task
id: P2.2-T2
status: completed
wave: 1
depends_on:
  - P2.2-T1
affected_files:
  - packages/core/src/ai-tools.ts
validation:
  - npm test
risk:
  - hash 只信 frontmatter 而不检查正文
```

#### Boundary

只校验 managed body，不解析用户业务 Markdown。

#### Acceptance

- 修改 managed body 后返回 `drifted`。
- update 后恢复 `unchanged`。

---

### P2.2-T3: 保护 foreign files

```sdd-task
id: P2.2-T3
status: completed
wave: 2
depends_on:
  - P2.2-T2
affected_files:
  - packages/core/src/ai-tools.ts
  - packages/core/src/index.test.ts
validation:
  - npm test
risk:
  - 覆盖用户手写 Claude Code 文件
```

#### Boundary

foreign 文件只报告，不写入。

#### Acceptance

- 同路径非 managed 文件保持原内容。

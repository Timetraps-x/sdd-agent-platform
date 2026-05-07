# Phase 2.7 安装到入口投影 E2E 验收 Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-2.7-entry-projection-e2e.md` 的执行 tasks。

## Task List

### P2.7-T1: 执行 clean build/pack/install

```sdd-task
id: P2.7-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - package.json
  - tsconfig.build.json
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - npm pack
  - npm install -g --prefix <tmp> ./sdd-agent-platform-0.1.0.tgz
risk:
  - 安装态和源码态行为不一致
```

#### Boundary

只使用 isolated prefix，不污染系统 npm prefix。

#### Acceptance

- installed `sdd --version` 输出 `0.1.0`。

---

### P2.7-T2: 执行临时目标仓库 E2E

```sdd-task
id: P2.7-T2
status: completed
wave: 1
depends_on:
  - P2.7-T1
affected_files:
  - packages/core/src/ai-tools.ts
  - packages/core/src/instructions.ts
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
validation:
  - sdd init --ai claude-code
  - sdd instructions overview --json
  - sdd update --check
  - sdd update
  - sdd doctor
risk:
  - E2E 未覆盖 drift 修复
```

#### Boundary

临时 target 可写，真实 target 只读。

#### Acceptance

- init 创建六个 entries。
- drift check 失败，update 修复，doctor AI entries PASS。

---

### P2.7-T3: 执行真实目标仓库 read-only smoke

```sdd-task
id: P2.7-T3
status: completed
wave: 2
depends_on:
  - P2.7-T2
affected_files:
  - specs/master/phase2.7-validation.md
validation:
  - D:\project\inshn-etalk-web instructions/update --check/doctor read-only smoke
risk:
  - 真实仓库已有未提交改动，写入 smoke 会污染现场
```

#### Boundary

不运行写入型 `sdd init` 或 `sdd update`。

#### Acceptance

- instructions 可返回 JSON。
- update --check/doctor 能报告 missing AI entries。

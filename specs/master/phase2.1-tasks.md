# Phase 2.1 全局 CLI 安装与 package/bin 硬化 Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-2.1-global-cli-install.md` 的执行 tasks。

## Task List

### P2.1-T1: 增加 CLI version 输出

```sdd-task
id: P2.1-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - packages/cli/src/main.ts
validation:
  - node ./dist/packages/cli/src/main.js --version
risk:
  - 全局安装后不能依赖目标仓库 package.json
```

#### Boundary

只增加 `--version`/`-v` 输出，不引入 package discovery。

#### Acceptance

- dist CLI 输出 `0.1.0`。

---

### P2.1-T2: 拆分 runtime-only build

```sdd-task
id: P2.1-T2
status: completed
wave: 1
depends_on:
  - P2.1-T1
affected_files:
  - package.json
  - tsconfig.build.json
validation:
  - npm run build
  - npm pack --dry-run
risk:
  - tarball 带入测试编译产物
```

#### Boundary

typecheck 继续覆盖测试；build 只输出 runtime。

#### Acceptance

- pack dry-run 不包含 `index.test.js`。

---

### P2.1-T3: 验证 tarball install/uninstall

```sdd-task
id: P2.1-T3
status: completed
wave: 2
depends_on:
  - P2.1-T2
affected_files:
  - package.json
validation:
  - npm install -g --prefix <tmp> ./sdd-agent-platform-0.1.0.tgz
  - sdd --version
  - npm uninstall -g --prefix <tmp> sdd-agent-platform
risk:
  - 全局 binary 链接不可用或卸载残留
```

#### Boundary

只在 isolated prefix 验证，不修改系统全局 npm prefix。

#### Acceptance

- install 后 binary 可运行。
- uninstall 后 binary 不残留。

# Phase 2.1 全局 CLI 安装与 package/bin 硬化 Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.1-global-cli-install.md` 的执行 plan。

## 1. 实施步骤

1. 保持 root package 作为当前安装入口，继续使用 `bin.sdd = ./dist/packages/cli/src/main.js`。
2. 在 CLI 中增加 `--version`。
3. 拆分 `tsconfig.build.json`，让 typecheck 覆盖测试、build 只输出 runtime。
4. 用 `npm pack --dry-run` 检查 tarball 内容。
5. 用 isolated prefix 执行 `npm install -g --prefix <tmp> ./sdd-agent-platform-0.1.0.tgz`。
6. 验证 binary 可执行并可卸载。

## 2. 修改文件

- `package.json`
- `tsconfig.build.json`
- `packages/cli/src/main.ts`

## 3. 验证命令

```bash
npm run typecheck
npm test
npm run build
node ./dist/packages/cli/src/main.js --version
npm pack --dry-run
npm install -g --prefix <tmp> ./sdd-agent-platform-0.1.0.tgz
npm uninstall -g --prefix <tmp> sdd-agent-platform
```

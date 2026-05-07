# Phase 2.1 全局 CLI 安装与 package/bin 硬化 Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.1-global-cli-install.md` 的执行 spec。

## 1. 目标

让 `sdd` CLI 可以通过 dist、tarball/global install 形态稳定运行，并保证发布包只包含运行时代码。

## 2. 范围

- root package `bin.sdd` 指向 dist CLI。
- `sdd --version` 不依赖目标仓库 package.json。
- `npm run build` 使用 runtime-only build config。
- `npm pack --dry-run` 验证 tarball 内容。
- tarball 安装到 isolated prefix 后 `sdd --version` 可用，uninstall 后 binary 消失。

## 3. 非目标

- 不发布公网 npm 包。
- 不改造 workspace 子包发布策略。
- 不引入外部 installer。

## 4. 验收标准

- `npm run typecheck` 通过。
- `npm test` 通过。
- `npm run build` 通过。
- `node ./dist/packages/cli/src/main.js --version` 输出 `0.1.0`。
- `npm pack --dry-run` 不包含 `*.test.js` 运行时产物。
- tarball global prefix install/uninstall smoke 通过。

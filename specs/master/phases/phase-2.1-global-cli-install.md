# Phase 2.1 全局 CLI 安装与 package/bin 硬化

## 1. 定位

Phase 2.1 在 Phase 2.0 执行基线完成后，产品化 `sdd` CLI 的本机可复用安装形态，确保 `sdd` 能从平台源码目录之外运行，并能在任意目标仓库执行基础命令。

## 2. 依赖

```yaml
depends_on:
  - phase-2.0-ai-tool-entry-projection
blocks:
  - phase-2.2-ai-tool-adapter-registry
  - phase-2.7-entry-projection-e2e
```

## 3. 范围

- 硬化 root package `bin.sdd` 与 dist 输出路径。
- 支持 `node ./dist/packages/cli/src/main.js --help` 和 `--version`。
- 验证 `npm link` 本地开发安装。
- 验证 `npm pack` tarball 与 `npm install -g ./sdd-agent-platform-<version>.tgz`。
- 明确安装源地址：本机 `D:\project\sdd-agent-platform`，未来 npm 发布只作为后续选项。
- 更新 README 中 Phase 2 安装使用说明。

## 4. 非目标

- 不生成 Claude Code entries。
- 不实现 adapter registry。
- 不实现 `sdd update`。
- 不做目标仓库完整 E2E。
- 不发布公网 npm 包。

## 5. 交付物

- `sdd --version`。
- package/bin/files 配置硬化。
- dist CLI smoke 验证。
- npm link 验证。
- npm pack dry-run 验证。
- tarball global install 验证记录。
- `specs/master/phase2.1-{spec,plan,tasks,validation}.md`。

## 6. 验收标准

- `npm run build` 后 root `bin.sdd` 指向的 dist CLI 可执行。
- `sdd --help` 与 `sdd --version` 在全局安装后可用。
- 目标仓库无需引用平台源码目录即可运行 `sdd init --ai none` 或等价基础 init。
- `npm pack --dry-run` 包含运行所需 dist 文件和 package metadata。
- tarball 安装、执行、卸载流程有验证证据。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-2.1-global-cli-install.md
required_by:
  - phase-2.2-ai-tool-adapter-registry
  - phase-2.7-entry-projection-e2e
```

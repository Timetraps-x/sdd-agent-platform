# Phase 2.7 安装到入口投影 E2E 验收 Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.7-entry-projection-e2e.md` 的执行 plan。

## 1. 实施步骤

1. 清理 `dist`，运行 typecheck/tests/build。
2. `npm pack` 生成 `sdd-agent-platform-0.1.0.tgz`。
3. 使用 isolated prefix 安装 tarball。
4. 验证 installed binary `--version`。
5. 创建临时 git target repo。
6. 在 target 中运行 `sdd init --ai claude-code`。
7. 运行 `sdd instructions overview --json`。
8. 运行 clean `sdd update --check`。
9. 人工追加 drift 到 `.claude/commands/sdd.md`。
10. 运行 drift `sdd update --check`，预期非 0。
11. 运行 `sdd update` 修复。
12. 再运行 `sdd update --check` 和 `sdd doctor`。
13. 卸载 isolated prefix package 并验证 binary 删除。
14. 对真实目标仓库只读运行 `instructions/update --check/doctor`。

## 2. 修改文件

- Phase 2 validation/status/index 文档。
- 不因 E2E 修改业务目标仓库。

## 3. 验证命令

```bash
rm -rf dist && npm run typecheck && npm test && npm run build
npm pack
npm install -g --prefix <tmp> ./sdd-agent-platform-0.1.0.tgz
sdd --version
sdd init --ai claude-code
sdd instructions overview --json
sdd update --check
sdd update
sdd doctor
npm uninstall -g --prefix <tmp> sdd-agent-platform
```

# Phase 4.2 Package Contents and Install Smoke

## 定位

Phase 4.2 验证 npm package 实际会打进哪些文件，以及 tarball 全局安装后 `sdd` 是否能在干净目标仓库中工作。

## 依赖

- Phase 4.1 Package Metadata Hardening completed。

## 范围

- 运行 `npm pack --dry-run`。
- 审计 package file list。
- 运行 `npm pack` 生成本地 tarball。
- 全局安装本地 tarball。
- 在干净 Git repo 中 smoke：`sdd --version`、`sdd init --ai claude-code`、`sdd status`、`sdd doctor`。
- 卸载本地 tarball package。

## 非目标

- 不运行 `npm publish --dry-run`。
- 不登录 npm。
- 不真实发布。
- 不切换默认安装文档。

## 交付物

- package contents audit。
- local tarball install smoke evidence。
- `phase4.2-spec.md`、`phase4.2-plan.md`、`phase4.2-tasks.md`、`phase4.2-validation.md`。

## 验收标准

- package file list 不包含 `.sdd/runs`、`.sdd/run-index.json`、`.claude/settings.local.json`、logs、smoke dirs 或 credentials。
- tarball install 后 `sdd` 可执行。
- clean target repo smoke 通过。

## 下游引用

Phase 4.3 只有在本地 package smoke 通过后才能运行 npm publish dry-run。
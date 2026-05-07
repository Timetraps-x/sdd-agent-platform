# Phase 4.1 Package Metadata Hardening

## 定位

Phase 4.1 只处理本地 npm package metadata 和 package assets，让项目具备可发布 npm CLI package 的静态条件。

## 依赖

- Phase 4.0 NPM Package Distribution Baseline。
- 用户确认 package name / scope / license / first public version。

## 范围

- 更新 `package.json` 的 public package metadata。
- 移除或调整 `private: true`。
- 设置 `license`、`repository`、`bugs`、`homepage`、`keywords`、`engines`、`publishConfig`。
- 审视 `files` 是否覆盖 runtime 所需资产。
- 保持 `bin.sdd` 指向 built CLI。
- 保持 GitHub direct install 兼容。

## 非目标

- 不运行 `npm pack`。
- 不运行 `npm publish --dry-run`。
- 不登录 npm。
- 不真实发布。
- 不切换 README / user-guide 默认安装命令。

## 交付物

- 更新后的 `package.json`。
- `phase4.1-spec.md`、`phase4.1-plan.md`、`phase4.1-tasks.md`、`phase4.1-validation.md`。

## 验收标准

- `package.json` 不再阻止 public npm publish。
- package metadata 足以被 npm 用户理解来源、license、repository 和 CLI 入口。
- `files` 不明显遗漏 runtime 必需资产。
- `npm run typecheck`、`npm test`、`npm run build` 通过。

## 下游引用

Phase 4.2 使用本 phase 的 package metadata 进行 `npm pack --dry-run` 和 tarball install smoke。
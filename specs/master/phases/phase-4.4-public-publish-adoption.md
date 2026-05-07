# Phase 4.4 Public Publish and Adoption

## 定位

Phase 4.4 是唯一允许真实发布到 npm registry 的阶段。它必须由用户明确确认，发布后再验证 public npm install，并最后切换 README / user-guide 默认安装路径。

## 依赖

- Phase 4.3 NPM Publish Dry-run and Human Runbook completed。
- 用户明确确认真实 publish。

## 范围

- 最终确认 `npm whoami`。
- 执行真实 `npm publish --access public` 或等价 scoped publish 命令。
- 从 public npm registry 安装 `@latest`。
- 在干净目标仓库中跑 install smoke。
- 成功后更新 README / user-guide 默认安装命令。
- 保留 GitHub direct install 作为 fallback。

## 非目标

- 不绕过 2FA/OTP。
- 不自动创建 npm token。
- 不强制创建 CI release automation。
- 不把失败 publish 伪装成完成。

## 交付物

- real publish evidence。
- public install smoke evidence。
- README / user-guide npm default install update。
- `phase4.4-spec.md`、`phase4.4-plan.md`、`phase4.4-tasks.md`、`phase4.4-validation.md`。

## 验收标准

- 用户明确确认 publish command。
- npm publish 成功。
- public `npm install -g <package>@latest` 成功。
- public package smoke 通过。
- 文档默认安装路径只在 public smoke 通过后切换。

## 下游引用

Phase 5 和后续 release automation 可以消费 Phase 4.4 的 publish evidence，但不能反向降低真实发布 gate。
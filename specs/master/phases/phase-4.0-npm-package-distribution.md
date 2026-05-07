# Phase 4.0 NPM Package Distribution Baseline

## 定位

Phase 4.0 不直接改 `package.json` 或执行 publish，而是把 npm published package 这件事拆成可落地的小 phase，并完成发布路线、包身份候选、人工 gate 和验证边界的定稿。

目标是把当前 GitHub direct install 路线升级为标准 npm package 分发路线，但真实发布必须在后续 phase 中经过 dry-run、人工确认和 post-publish smoke。

## 调研结论

- npm 官方文档显示，公开发布需要关注 `package.json` metadata、`files` 包含规则、`publishConfig`、`npm publish` 行为和 scoped package 的 `--access public`。
- Spec Kit 当前仍采用 GitHub direct install 模式：`uv tool install ... --from git+https://github.com/github/spec-kit.git`，说明 GitHub 直装可作为 publish 前过渡路径。
- GSD 采用 npm/npx installer 路线：`npx get-shit-done-cc@latest`，适合“一次性安装器/初始化器”形态。
- OpenSpec 采用标准 npm package 路线：`npm install -g @fission-ai/openspec@latest`，这是本项目 Phase 4 的目标体验。
- `npm view sdd-agent-platform name version --json` 当前返回 404；`npm view @timetraps/sdd-agent-platform name version --json` 当前也返回 404。它们看起来未被公开包占用，但 scoped 包仍取决于用户是否拥有对应 npm scope。

## Phase 4 拆分

| Phase | 定位 | 主要边界 | 是否可自动执行 |
|---|---|---|---|
| 4.0 | Distribution baseline / package identity | 决定路线、拆 phase、记录候选包名和人工 gate | 是，仅文档 |
| 4.1 | Package metadata hardening | 修改 `package.json` / package assets，使包可发布 | 是，本地代码/文档 |
| 4.2 | Package contents and local install smoke | `npm pack --dry-run`、tarball install、目标仓库 smoke | 是，本地命令 |
| 4.3 | Publish dry-run and human runbook | `npm publish --dry-run`、npm account/login/runbook | dry-run 可执行；login/OTP 需用户 |
| 4.4 | Public publish and post-publish adoption | 真实 `npm publish`、public install smoke、默认文档切换 | 否，必须用户明确确认 |

## 依赖

- Phase 2.1 Global CLI Install。
- Phase 2.7 Entry Projection E2E。
- Phase 2.11 Artifact UX and Run Hygiene Hardening。
- Phase 3.15 Workflow Entrypoint Unification。
- 当前 GitHub 仓库已可作为临时安装源：`npm install -g git+https://github.com/Timetraps-x/sdd-agent-platform.git`。

## 范围

- 明确 npm package distribution 的阶段拆分。
- 记录候选 package identity 和 registry availability 证据。
- 明确 scoped vs unscoped 的选择权属于用户。
- 明确真实 publish 不属于自动执行路径。
- 为 Phase 4.1~4.4 创建 retained artifacts 与执行文档。

## 非目标

- 不修改 `package.json` metadata。
- 不运行 `npm pack`、`npm publish --dry-run` 或真实 `npm publish`。
- 不创建 CI/CD release pipeline。
- 不配置 npm token、GitHub Actions secret 或 release automation。
- 不切换 README / user-guide 默认安装命令到尚未发布的 npm package。

## 交付物

- Phase 4.0 retained docs：`phase4.0-spec.md`、`phase4.0-plan.md`、`phase4.0-tasks.md`、`phase4.0-validation.md`。
- Phase 4.1~4.4 retained phase artifacts and execution docs。
- Phase indexes/status/validation index 更新。
- 包名候选与 npm registry 查询结果。

## 验收标准

- Phase 4 不再是一个过大的单 phase，而是拆为 4.0~4.4。
- 每个 Phase 4.x 都有明确 scope、non-goals、acceptance 和 validation gate。
- 真实 publish 被明确隔离到 Phase 4.4，并要求用户确认。
- publish 前默认安装路径仍保持 GitHub direct install。
- Phase 5 继续保留代码知识图谱方向，不与 Phase 4 npm distribution 混淆。

## 下游引用

- Phase 4.1 消费本 phase 的 package identity decision。
- Phase 4.2 消费 Phase 4.1 的 metadata/package contents。
- Phase 4.3 消费 Phase 4.2 的 local smoke 结果。
- Phase 4.4 消费 Phase 4.3 的 dry-run 和 human runbook。
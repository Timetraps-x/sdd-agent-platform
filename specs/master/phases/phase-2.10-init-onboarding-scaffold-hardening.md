# Phase 2.10 Init Onboarding Scaffold Hardening

## 定位

Phase 2.10 是 Phase 2 的 release hardening 小阶段。目标是让 `sdd init` 一次性生成接入所需的 runtime、starter semantic docs 和 Claude Code entries，而不是要求用户后续再通过 slash command 主动创建 `spec.md`、`plan.md`、`tasks.md`。

## 依赖

- Phase 2.3 Init / Update Generated Entries 闭环。
- Phase 2.8 Status / Run Inspect / Sync-back UX。
- Phase 2.9 Claude Code Workflow Command Hardening。

## 范围

- `sdd init --ai claude-code` 默认生成：
  - `.sdd/project.yml`
  - `.sdd/runs/`
  - 可选 starter `specs/master/spec.md`
  - 可选 starter `specs/master/plan.md`
  - 可选 starter `specs/master/tasks.md`
  - Claude Code managed entries
- 当前形态：`sdd init` 是项目级接入，不再作为 branch workflow 入口；分区 workflow 由 `/sdd:spec` 和 `sdd status [--branch]` 处理。
- 支持 `sdd init --no-scaffold-docs`。
- 默认不覆盖已有 semantic docs；显式 `--force` 才覆盖。
- 更新 generated entries、instruction payload、用户文档和验证记录。

## 非目标

- 不新增 background write agent。
- 不新增 per-task worktree。
- 不做 dependency wave runner。
- 不做 dashboard、SQLite、plugin loader、code knowledge graph。
- 不自动创建 run。
- 不自动执行 onboarding task。
- 不自动 commit/push。
- 不静默 `sync-back apply`。

## 交付物

- Core init-time starter docs scaffold。
- CLI init options：`--branch`、`--no-scaffold-docs`。
- Starter onboarding `sdd-task` block：`ONBOARDING-1`。
- Updated Claude Code generated entries and instruction payloads。
- Tests for default scaffold, preserve, force, branch, skip behavior。
- Updated README / user guide / phase indexes。

## 验收标准

- 新 Git 仓库执行 `sdd init --ai claude-code` 后，`specs/master/spec.md`、`plan.md`、`tasks.md` 自动存在。
- `sdd status --branch master` 不再因为 missing documents 报 blocking gaps。
- `sdd tasks inspect ONBOARDING-1 --branch master` 能读取 Boundary / Acceptance。
- 已有 semantic docs 默认不被覆盖。
- `--force` 能明确覆盖 starter docs。
- `--branch <branch>` 能生成目标 branch docs。
- `--no-scaffold-docs` 能跳过 starter docs。
- `npm test`、`npm run build`、`sdd doctor`、临时目标仓库 smoke 通过。

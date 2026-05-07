# Phase 2.11 Artifact UX and Run Hygiene Hardening

## 定位

Phase 2.11 是 Phase 2 进入 Phase 3 前的 release hardening 小阶段。目标是降低 `sdd-result-v1` artifact 手写成本，并让失败/探索性 run 可以保留证据但不污染正常 `doctor`。

## 依赖

- Phase 2.8 Workflow UX / Status / Run Inspect / Sync-back Hardening。
- Phase 2.9 Claude Code Workflow Command Hardening。
- Phase 2.10 Init Onboarding Scaffold Hardening。

## 范围

- 提供 `sdd artifact template`，打印合法 `sdd-result-v1` artifact skeleton。
- Validator template 自动复制任务 Acceptance 原文到 `## Acceptance Mapping`。
- 保持 artifact contract 严格校验，但优化错误说明和修复建议。
- `sdd artifact validate` 默认输出人类可读报告，保留 `--json`。
- 提供 `sdd run archive <run_id> [--reason <text>]`，归档 run 并终止 running delegation。
- `sdd doctor` 支持默认跳过 archived runs、`--latest-only`、`--all-runs`。
- 更新 Claude Code generated entries、instruction payload、README、用户指南和 phase 索引。

## 非目标

- 不新增 background write agent。
- 不新增 per-task worktree。
- 不做 dependency wave runner。
- 不做 plugin loader、dashboard、SQLite run database、code knowledge graph。
- 不自动 commit/push。
- 不自动 `sync-back apply`。
- 不引入 fuzzy acceptance matching。
- 不删除历史 run evidence；archive 是保留证据下的健康检查降噪机制。

## 交付物

- Core artifact template renderer。
- Artifact validation UX recommendations。
- Run archive core API。
- Doctor run evidence scope controls。
- CLI commands：`artifact template`、增强 `artifact validate`、`run archive`、`doctor --latest-only/--all-runs`。
- Updated Claude Code generated entries and instruction payloads。
- Tests for template rendering、validator Acceptance mapping、run archive、doctor scope。
- Updated README / user guide / phase indexes。

## 验收标准

- `sdd artifact template artifacts/review-T001.md --task T001 --agent reviewer` 输出自引用合法 artifact。
- Validator artifact template 包含任务 Acceptance 原文。
- `sdd artifact validate` 对无效 artifact 输出可执行修复建议。
- `sdd verify` 在 validator artifact 包含 exact Acceptance mapping 时可通过，缺失 exact text 时仍 deterministic block。
- `sdd run archive` 将 running delegation 标为 `CANCELLED` 并保留 state/events/artifacts。
- 默认 `sdd doctor` 跳过 archived runs。
- `sdd doctor --latest-only` 只检查最新非归档 run。
- `sdd doctor --all-runs` 可审计历史归档 run。
- `npm run typecheck`、`npm test`、`npm run build`、`update --check`、临时目标仓库 smoke 和 global install smoke 通过。

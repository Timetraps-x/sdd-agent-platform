# Phase 2.11 Plan

## Approach

1. 在 `packages/core/src/index.ts` 增加 artifact template renderer，复用现有 path normalization 和 task inspection 逻辑。
2. 保持 `sdd-result-v1` contract 严格，增强 validation issue/recommendation 文案。
3. 在 `packages/cli/src/main.ts` 增加 `sdd artifact template`，并让 `artifact validate` 默认输出 concise human-readable report。
4. 在 core 增加 `archiveRun`，扩展 `RunStatus` 为 `archived`，归档时取消 running delegation 并追加事件。
5. 扩展 `doctor(projectRoot, options)` 和 run evidence inspection scope，支持默认非归档、latest-only、all-runs。
6. 更新 `packages/core/src/ai-tools.ts` 与 `instructions.ts`，让 Claude Code entries / instruction payload 引导用户使用 template、validate、archive 和 doctor scope。
7. 增加 core/CLI/instruction tests，覆盖 artifact template、Acceptance mapping、verify deterministic behavior、archive、doctor scope 和 help text。
8. 更新 README、用户指南和 Phase 2.11 留存文档。
9. 运行 typecheck/test/build/update-check/doctor、临时目标仓库 smoke 和 global install smoke。

## Safety

- 不放松 artifact contract，不引入 fuzzy matching。
- Template 只打印 Markdown，不写文件。
- Archive 不删除 state/events/artifacts，不修改 specs，也不自动 sync-back。
- `doctor --all-runs` 保留历史审计能力。
- `--latest-only` 和 `--all-runs` 同时出现时 CLI 返回 usage error，避免 scope 歧义。

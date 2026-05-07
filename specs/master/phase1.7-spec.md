# Phase 1.7 Spec — Claude Code Command Integration

## 1. 目标

在 Phase 1.2 runtime skeleton、Phase 1.4 command assets、Phase 1.5 parser 和 Phase 1.6 artifact/delegation contract 之上，实现有界的 Claude Code command integration。

本阶段把 `/sdd-*` 静态命令入口从 placeholder 更新为可调用 TypeScript CLI/runtime 的薄入口，并落地 canonical lifecycle decision gate 的最小可测试实现。

## 2. 范围

- 在 core 中实现 lifecycle decision gate：signal normalization、hard gate evaluation、direct whitelist、profile routing、confidence、checkpoint need、required/skipped stages、reasons、escalation triggers。
- 在 core 中提供将 lifecycle decision record 写入已有 run state/events 的函数。
- 在 CLI 中增加 `sdd lifecycle decide` smoke/command entry，支持输出文本/JSON，并可通过 `--run <run_id>` 记录到 run。
- 更新 `commands/sdd-*.md`，将 Phase 1.4 placeholder 改为 Phase 1.7 command gate contract。
- 增加 tests 覆盖 hard gates、direct whitelist、checkpoint triggers、research route、run recording 和 command integration boundary。
- 更新 retained docs、README/indexes/PHASE_STATUS，并记录验证证据。

## 3. 非目标

- 不实现 Phase 1.8 single-task loop。
- 不执行 task implement/review/debug/verify workflow。
- 不启动 Claude Code subagent，不做 agent dispatch。
- 不实现 Phase 1.9 goal-level verifier / doctor hardening。
- 不做 tool registry、plugin loader、worktree、background write、自动 commit/push/PR。
- 不把完整平台逻辑写入 slash command prompt。

## 4. 依赖

- `docs/architecture/lifecycle-decision-model.md`
- `specs/master/phases/phase-1.7-claude-code-command-integration.md`
- `packages/core/src/index.ts`
- `packages/cli/src/main.ts`
- `commands/sdd-*.md`

## 5. 验收标准

- `sdd lifecycle decide --direct-safe` 能输出 direct/high 且无 checkpoint。
- API/schema/database/security/state-machine/concurrency/CI/dependency/build/release 类 hard gate 不能被 direct whitelist 绕过，最低升级到 full。
- external unknown / architecture / unscoutable low impact 能进入 research。
- policy/permission/human checkpoint 能记录 checkpoint required。
- gate 输出 profile、confidence、reasons、required/skipped stages、escalation triggers、checkpoint need 和 command boundaries。
- 当提供 existing run id 时，decision 写入 `.sdd/runs/<run_id>/state.json` 并追加 event。
- `/sdd-*` command docs 保持薄 contract，声明 CLI/runtime gate，不执行 agents/workflows。
- `npm run typecheck`、`npm test`、`npm run build` 和 lifecycle smoke 通过。

# Phase 2.8 Plan

## Approach

1. 在 core 层新增结构化 API：`listRuns`、`inspectRun`、`getProjectStatus`、`inspectSyncBack`、`applySyncBack`。
2. 在 CLI 层新增用户命令，并提供文本输出与 `--json` 输出。
3. 在 sync-back apply 中只修改目标 task 的 `sdd-task` metadata 和 `#### Implementation Notes`。
4. 更新 instruction API 与 generated Claude Code entries，使入口从 doctor-first 升级为 status-first。
5. 增加测试覆盖 run/status/sync-back 行为。
6. 通过 typecheck/test/build/CLI smoke 与真实仓库只读 smoke 验证。

## Risk Controls

- `applySyncBack` 是唯一新增写回 Markdown 的入口。
- blocked / 非 PASS / 有 blocking gaps / proposal 缺失 / task 不唯一时拒绝写回。
- 重复 apply 不重复追加 notes。
- 真实目标仓库写回前只做 inspect；写回需用户明确允许。

## Validation

- `npm run typecheck`
- `npm test`
- `npm run build`
- `node ./dist/packages/cli/src/main.js --help`
- `node ./dist/packages/cli/src/main.js status`
- `node ./dist/packages/cli/src/main.js run list`
- `node ./dist/packages/cli/src/main.js run inspect 20260501-020`

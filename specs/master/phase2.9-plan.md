# Phase 2.9 Plan

## Approach

1. 新增 Phase 2.9 phase artifact 与 spec/plan/tasks/validation 文档，并纳入索引。
2. 在 `packages/core/src/ai-tools.ts` 中将 `/sdd`、`/sdd:do`、`/sdd:verify` 改为 workflow-specific templates。
3. 在 `packages/core/src/instructions.ts` 中收紧 `overview`、`do`、`verify` payload，使其与 generated entries 的状态驱动流程一致。
4. 扩展 `packages/core/src/index.test.ts`，覆盖 generated command body 与 instruction payload。
5. 运行 typecheck/test/build，并用 `sdd update` 刷新 managed `.claude` entries。
6. 执行平台仓库 smoke 与真实目标仓库只读 smoke。
7. 更新 validation、tasks 与 phase status。

## Risk Controls

- 不新增 CLI 命令和 runtime API，避免扩大 Phase 2.9 范围。
- generated entries 只引导已有 CLI/core 行为，不实现隐藏状态逻辑。
- `sync-back apply` 只作为显式用户批准后的写操作，不出现在自动执行路径中。
- 真实目标仓库只做只读 smoke，除非用户明确批准，不运行 `sdd update` 或 `sync-back apply`。

## Validation

- `npm run typecheck`
- `npm test`
- `npm run build`
- `node ./dist/packages/cli/src/main.js update --check`
- `node ./dist/packages/cli/src/main.js instructions overview --json`
- `node ./dist/packages/cli/src/main.js instructions do --json`
- `node ./dist/packages/cli/src/main.js instructions verify --json`
- `node ./dist/packages/cli/src/main.js status`
- `node ./dist/packages/cli/src/main.js doctor`
- Real target read-only: `status` and `sync-back inspect 20260506-002 --task T001`.

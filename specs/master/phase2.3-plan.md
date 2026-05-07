# Phase 2.3 Init / Update Generated Entries 闭环 Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.3-init-update-generated-entries.md` 的执行 plan。

## 1. 实施步骤

1. 扩展 `initProject` options，加入 `aiTool`。
2. `initProject` 在写入 `.sdd` 后调用 `applyAiToolEntries`。
3. CLI `init` 解析 `--ai`。
4. CLI 新增 `update`，解析 `--check` 和 `--ai`。
5. `summarizeAiProjectionStatus` 将 drift/missing/foreign/conflict 归为 FAIL。
6. 用 temp repo 和 tarball install E2E 验证 init/update/check。

## 2. 修改文件

- `packages/core/src/index.ts`
- `packages/core/src/ai-tools.ts`
- `packages/cli/src/main.ts`
- `packages/core/src/index.test.ts`

## 3. 验证命令

```bash
npm run typecheck
npm test
node ./dist/packages/cli/src/main.js init --ai claude-code
node ./dist/packages/cli/src/main.js update --check
node ./dist/packages/cli/src/main.js update
```

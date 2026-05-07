# Phase 2.4 Instruction API 与薄入口改造 Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.4-instruction-api-thin-entries.md` 的执行 plan。

## 1. 实施步骤

1. 新增 `instructions.ts`，定义 instruction payload contract。
2. 为 overview/init/doctor/update/run-task/verify-task 定义 required commands、allowed/forbidden side effects、next steps。
3. 从 `index.ts` re-export instruction API。
4. CLI 增加 `instructions` command，支持 action 和 `--json`。
5. Claude Code generated entries 只引用 instruction API，不复制 workflow brain。
6. 用 unit test 和 dist CLI smoke 验证。

## 2. 修改文件

- `packages/core/src/instructions.ts`
- `packages/core/src/index.ts`
- `packages/core/src/ai-tools.ts`
- `packages/cli/src/main.ts`
- `packages/core/src/index.test.ts`

## 3. 验证命令

```bash
npm run typecheck
npm test
node ./dist/packages/cli/src/main.js instructions --json
```

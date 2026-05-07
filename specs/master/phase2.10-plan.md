# Phase 2.10 Plan

## Approach

1. 在 `packages/core/src/index.ts` 扩展 `initProject`，新增 init-time semantic document scaffold。
2. 内嵌 starter doc renderers，避免全局安装后依赖源码 `templates/`。
3. 在 `packages/cli/src/main.ts` 为 `sdd init` 增加 `--branch` 和 `--no-scaffold-docs`。
4. 更新 `packages/core/src/ai-tools.ts` 与 `instructions.ts`，让 Claude Code entries / instruction payload 反映 init 默认生成 starter docs。
5. 在 `packages/core/src/index.test.ts` 增加 default/preserve/force/branch/skip 测试。
6. 更新 README、用户指南和 Phase 2 索引。
7. 运行 typecheck/test/build/update/check/smoke/global install 验证。

## Safety

- 默认不覆盖已有 semantic docs。
- `--force` 才覆盖。
- starter task 明确不代表可直接执行真实实现。
- 不创建 run，不自动 do/verify，不自动 sync-back apply。

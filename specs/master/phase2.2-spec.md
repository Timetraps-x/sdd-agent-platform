# Phase 2.2 AI Tool Adapter Registry 与 Claude Code Adapter Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.2-ai-tool-adapter-registry.md` 的执行 spec。

## 1. 目标

建立 AI tool adapter registry，首个 adapter 为 Claude Code，负责声明 generated skill/command entry、frontmatter metadata、hash 和 drift 状态。

## 2. 范围

- 新增 `packages/core/src/ai-tools.ts`。
- 定义 `AiToolAdapter`、`AiToolSelection`、`ProjectedAiEntry`、`AiProjectionResult`。
- 支持 `auto | claude-code | none` 选择。
- 生成 Claude Code skill/command entry 模板。
- 使用 `sdd-ai-entry-v1` metadata 和 body hash。
- 识别 `created | unchanged | updated | missing | drifted | foreign | conflict`。

## 3. 非目标

- 不实现其他 AI 工具 adapter。
- 不覆盖 foreign 文件。
- 不把完整 workflow brain 写入 generated markdown。

## 4. 验收标准

- init 默认可创建 Claude Code entries。
- generated entries 包含 `sdd_contract: sdd-ai-entry-v1` 和 `sdd_hash`。
- 修改 managed body 后 drift check 能发现 drift。
- update 能刷新 managed drift。
- 同路径 foreign 文件不会被覆盖。

# Phase 2.4 Instruction API 与薄入口改造 Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.4-instruction-api-thin-entries.md` 的执行 spec。

## 1. 目标

提供 `sdd instructions <action> [--json]`，让 generated Claude Code skill/command 只作为薄入口，动态边界和下一步由 CLI/core instruction API 返回。

## 2. 范围

- 新增 `packages/core/src/instructions.ts`。
- 定义 `sdd-instructions-v1` contract。
- 支持 `overview | init | doctor | update | run-task | verify-task`。
- CLI 接入 `sdd instructions [action] [--json]`。
- generated entries 引用 `sdd instructions <action> --json`。

## 3. 非目标

- 不把完整 workflow brain 写入 generated markdown。
- 不让 instruction API 修改项目文件。
- 不引入远程服务或插件系统。

## 4. 验收标准

- `getSddInstructions('doctor')` 返回稳定 contract。
- `node ./dist/packages/cli/src/main.js instructions --json` 输出 overview JSON。
- generated entries 中包含 `sdd instructions overview --json` 或 action-specific instructions 命令。

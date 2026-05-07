# Phase 2.4 Instruction API 与薄入口改造

## 1. 定位

Phase 2.4 提供 `sdd instructions <action> --json`，让 generated Claude Code skills/commands 只作为薄入口，动态状态、artifact graph 和下一步指令由 CLI/core 输出。

## 2. 依赖

```yaml
depends_on:
  - phase-2.2-ai-tool-adapter-registry
  - phase-2.3-init-update-generated-entries
blocks:
  - phase-2.7-entry-projection-e2e
```

## 3. 范围

- 新增 `packages/core/src/instructions.ts`。
- 新增 `sdd instructions <action> [--json]`。
- 首批 action：overview、init、doctor、update、run-task、verify-task。
- 定义 `sdd-instructions-v1` JSON contract。
- 更新 generated entry templates，使其引用 instruction API，而不复制完整 workflow brain。
- 增加 instruction API tests。

## 4. 非目标

- 不实现 background agents。
- 不实现 worktree/concurrency。
- 不改变 Phase 1 task loop 语义。
- 不把完整 workflow 状态机塞进 markdown。

## 5. 交付物

- `packages/core/src/instructions.ts`。
- CLI `instructions` 命令。
- generated entry template 更新。
- instruction JSON contract tests。
- `specs/master/phase2.4-{spec,plan,tasks,validation}.md`。

## 6. 验收标准

- `sdd instructions overview --json` 输出可解析 JSON。
- JSON 包含 contract、version、action、summary、requiredCommands、allowedSideEffects、forbiddenSideEffects、nextSteps。
- generated entries 仍保持短小，并显式调用 instruction API。
- Typecheck/tests/build 通过。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-2.4-instruction-api-thin-entries.md
required_by:
  - phase-2.7-entry-projection-e2e
```

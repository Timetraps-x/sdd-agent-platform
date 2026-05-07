# Phase 1.7 Claude Code 命令接入

## 1. 定位

Phase 1.7 在 Phase 1.1 架构基线、Phase 1.2 runtime skeleton、Phase 1.4 command assets 和 Phase 1.5 parser 完成后，把 Claude Code slash command / skill 作为交互入口，把 TypeScript runtime 作为状态和契约执行层。

本阶段开始接入 Phase 1.0 调研后确定的 lifecycle decision gate，但命令层仍保持薄入口。

## 2. 依赖

```yaml
depends_on:
  - phase-1.1-architecture-baseline
  - phase-1.2-runtime-skeleton
  - phase-1.4-commands-agents-workflows
  - phase-1.5-sdd-parser-task-model
blocks:
  - phase-1.8-single-task-loop
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```

## 3. 范围

- 设计 `/sdd-doctor`、`/sdd-spec`、`/sdd-plan`、`/sdd-tasks`、`/sdd-do`、`/sdd-verify` 的薄入口。
- 命令入口只负责读取当前阶段上下文、调用 CLI、组织 agent prompt。
- 接入 Phase 1.0 调研后确定的 lifecycle decision gate。
- 如果模型尚未验证，只允许记录用户显式选择或保守 profile。
- 明确每个命令的 gate、输入、输出和禁止事项。

## 4. 非目标

- 不把完整平台逻辑写进 slash command prompt。
- 不在命令层复制 runtime 状态机。
- 不绕过 Claude Code 原生权限与用户确认。
- 不实现 tool registry / plugin loader。

## 5. 交付物

- `/sdd-*` command 入口文档。
- command 到 CLI/runtime 的调用 contract。
- lifecycle decision gate 接入说明。
- command checkpoint / phase gate 行为说明。

## 6. 验收标准

- 每个命令都能说明调用哪个 runtime 能力。
- 命令 prompt 保持短 contract。
- 阶段推进仍需要 checkpoint，不静默连跳。
- lifecycle decision gate 能记录 profile、confidence、reason、required/skipped stages 和 escalation triggers。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.7-claude-code-command-integration.md
required_by:
  - phase-1.8-single-task-loop
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```

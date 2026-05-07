# Phase 1.4 Spec — Commands / Agents / Workflows Pack

## 1. 目标

在 Phase 1.1 架构基线和 Phase 1.3 static contract/templates/adapters 之上，固化可版本化、可检查、可演进的 command / agent / workflow 静态资产包。

本阶段只交付静态资产，不接入 Claude Code slash command，不执行 lifecycle decision gate，不实现 agent 调度或 workflow runtime。

## 2. 范围

### Commands

- `commands/sdd-spec.md`
- `commands/sdd-plan.md`
- `commands/sdd-tasks.md`
- `commands/sdd-do.md`
- `commands/sdd-verify.md`
- `commands/sdd-doctor.md`

每个 command 需要声明：版本头、输入、输出、禁止事项、成功标准、workflow 绑定、lifecycle decision gate 占位位置。

### Agents

- `agents/scout.md`
- `agents/spec-reviewer.md`
- `agents/planner.md`
- `agents/implementer.md`
- `agents/reviewer.md`
- `agents/debugger.md`
- `agents/validator.md`

每个 agent prompt 保持短 contract：角色边界、输入、允许/禁止事项、输出 artifact 格式、成功标准。

### Workflows

- `workflows/spec.yml`
- `workflows/plan.yml`
- `workflows/tasks.yml`
- `workflows/do.yml`
- `workflows/verify.yml`
- `workflows/doctor.yml`

每个 workflow 声明阶段 gate、输入 artifact、输出 artifact、禁止自动跨越的 checkpoint、允许 agent 和 doctor 检查资产。

## 3. 非目标

- 不实现 Phase 1.5 SDD parser / task model reader。
- 不实现 Phase 1.6 artifact/delegation runtime。
- 不实现 Phase 1.7 Claude Code command integration 或 lifecycle decision gate 执行。
- 不实现 Phase 1.8 single task loop。
- 不实现 Phase 1.9 goal-level doctor hardening。
- 不引入 plugin loader、tool registry、background write、worktree isolation、自动 commit/push/merge。

## 4. 依赖

- `docs/architecture/sdd-agent-platform-architecture.md`
- `docs/architecture/lifecycle-decision-model.md`
- `specs/master/phases/phase-1.4-commands-agents-workflows.md`
- `schemas/contracts/*`
- `templates/*`
- `adapters/*`

## 5. 验收标准

- 所有 command / agent / workflow 资产存在且包含 contract/version metadata。
- command 入口声明 lifecycle decision gate placeholder，但不执行 gate。
- agent prompt 不复制完整平台说明，不承载状态机。
- workflow contract 声明阶段 gate、输入/输出 artifact、checkpoint 和禁止自动跨越事项。
- doctor 可根据静态资产路径和 metadata 检查 command/agent/workflow 资产。
- Phase 1.5+ 状态保持 planned。

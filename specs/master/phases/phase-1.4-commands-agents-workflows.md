# Phase 1.4 Commands / Agents / Workflows Pack

## 1. 定位

Phase 1.4 在 Phase 1.1 架构基线和 Phase 1.3 static contract/templates/adapters 稳定后，固化 Claude Code 交互入口、agent 角色边界和阶段 workflow contract。

本阶段只定义可加载、可检查、可演进的 command/agent/workflow 资产，不真正执行 agent 调度。

## 2. 依赖

```yaml
depends_on:
  - phase-1.1-architecture-baseline
  - phase-1.3-contract-templates-adapters
blocks:
  - phase-1.7-claude-code-command-integration
  - phase-1.8-single-task-loop
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```

## 3. 范围

- commands：`sdd-spec.md`、`sdd-plan.md`、`sdd-tasks.md`、`sdd-do.md`、`sdd-verify.md`、`sdd-doctor.md`。
- agents：`scout.md`、`spec-reviewer.md`、`planner.md`、`implementer.md`、`reviewer.md`、`debugger.md`、`validator.md`。
- workflows：`spec.yml`、`plan.yml`、`tasks.yml`、`do.yml`、`verify.yml`、`doctor.yml`。
- 每个 command / agent / workflow 的输入、输出、禁止事项、成功标准和依赖 contract。
- lifecycle decision 在 command 入口中的占位 contract：本阶段只声明 gate 位置和 contract placeholder；实际 Claude Code command integration 与 lifecycle decision gate 执行归属 Phase 1.7。

## 4. 非目标

- 不实现 plugin loader。
- 不实现 tool registry。
- 不把完整平台说明复制进每个 agent prompt。
- 不在本阶段真正调用 Claude Code subagent 执行任务。
- 不实现 workflow runtime，只定义可加载、可检查的 workflow contract。

## 5. 交付物

- `commands/*.md`
- `agents/*.md`
- `workflows/*.yml`
- command / agent / workflow contract 说明。
- doctor 对 command/agent/workflow 资产检查的规则说明。

## 6. 验收标准

- 每个 command / agent / workflow 都有版本头或 contract 标识。
- agent prompt 保持短 contract，只声明角色边界、输入、禁止事项、输出格式和成功标准。
- workflow contract 能声明阶段 gate、输入 artifact、输出 artifact 和禁止自动跨越的 checkpoint。
- command 入口能说明依赖哪些 runtime 能力和 contract，但不复制 runtime 状态机。
- doctor 能检查 command/agent/workflow 资产是否存在、版本是否完整、contract 是否缺失。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.4-commands-agents-workflows.md
required_by:
  - phase-1.7-claude-code-command-integration
  - phase-1.8-single-task-loop
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```

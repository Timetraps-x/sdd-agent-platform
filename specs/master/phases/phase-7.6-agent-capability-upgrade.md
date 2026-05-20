# Phase 7.6 Agent Capability Upgrade

## 1. 定位

Phase 7.6 在 runtime/state/verification/test 基础稳定后升级 agent 能力。目标不是把 workflow 模板写复杂，而是通过 agent、skill、material library 和 capability routing 提升 spec/plan/verifies/test/sync-back 的判断质量。

本阶段已基于现有 agent registry、skill registry、material/capability sources、真实项目缺口，以及 Claude Code skills/subagents、Oh My OpenAgent/OpenCode、AutoGen/CrewAI 等 capability routing 和 material reuse 机制完成研究与转译。

## 2. 依赖

- depends_on: Phase 7.5 Test Runtime and Evidence Execution
- blocks: Phase 7.7 Command-scoped Team Runtime
- required_by: Phase 7.7 Command-scoped Team Runtime

## 3. 范围

- 增强 norm discovery、uncertainty resolution、performance planning、verification design、evidence collection、sync-back risk review、release summary、context curation 等 agent capability。
- 让 workflow artifact 只承载 agent 分析后的结论、约束和可审依据。
- 让素材库按 project/command/risk/role 路由，而不是全量进入主上下文。
- 让 capability 来源在 registry/doctor/CLI 中可见。

## 4. 非目标

- 不做全局 agent OS。
- 不让 subagent 直接做 workflow-affecting decision。
- 不默认所有命令启用多 agent。
- 不把素材库全注入主上下文。

## 5. 交付物

- Agent capability catalog extension: `packages/core/src/registries/agent-capability-catalog.ts`。
- Material routing policy: routed `materialPacks` with `loadPolicy` and `contextBudget`。
- Capability-to-command mapping: `spec`、`plan`、`verifies`、`test`、`verify`、`sync-back`、`ship` mappings。
- Registry/doctor/CLI visibility: `sdd agent-capabilities list|validate` and doctor `agent_capability_catalog` check。

## 6. 验收标准

- `/sdd:spec` capability mapping covers norm alignment and high-risk uncertainty convergence.
- `/sdd:plan` capability mapping covers performance/token/context planning.
- `/sdd:verifies` capability mapping covers verification design.
- `/sdd:test` capability mapping covers bounded evidence collection.
- registry/doctor/CLI can show capability source and mapping health.
- 常驻上下文不因素材库扩展显著膨胀：active command mappings use `summary_only` or `route_when_triggered`, not global inline material.

## 7. 可被下游引用的产物

- `specs/master/phases/phase-7.6-agent-capability-upgrade.md`
- `specs/master/phase7.6-research.md`
- `specs/master/phase7.6-spec.md`
- `specs/master/phase7.6-plan.md`
- `specs/master/phase7.6-tasks.md`
- `specs/master/phase7.6-validation.md`
- Agent capability catalog and material routing contract

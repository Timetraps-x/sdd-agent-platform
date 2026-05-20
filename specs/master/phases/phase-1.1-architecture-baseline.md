# Phase 1.1 架构基线

## 1. 定位

Phase 1.1 在 Phase 1.0 完成后执行，吸收 Phase 1.0 交付的 Final Lifecycle Decision Model、profile routing algorithm 和 lifecycle decision architecture handoff，再补齐全平台架构所需的其他必要调研，最终冻结可靠的架构基线、contract 总览和后续 phase 依赖关系。

本阶段不重新发明 lifecycle decision；它负责把 Phase 1.0 的模型、算法和架构边界纳入全平台 architecture baseline，并补齐 runtime、assets、parser、artifact、command、workflow、doctor、trial 所需的架构决策。

## 2. 依赖

```yaml
depends_on:
  - phase-1.0-lifecycle-research
blocks:
  - phase-1.2-runtime-skeleton
  - phase-1.3-contract-templates-adapters
  - phase-1.4-commands-agents-workflows
  - phase-1.7-claude-code-command-integration
  - phase-1.10-real-project-trial
```

## 3. 范围

- 吸收 Phase 1.0 Final Lifecycle Decision Model。
- 吸收 Phase 1.0 profile routing algorithm。
- 吸收 Phase 1.0 lifecycle decision architecture handoff。
- 补齐全平台架构所需的必要调研和取舍。
- 形成 architecture baseline 或明确阻塞性 architecture gaps。
- 定义平台分层：core、cli、commands、agents、workflows、templates、adapters、schemas/contracts。
- 定义用户级平台资产与项目级 `.sdd` 运行资产边界。
- 定义 Markdown 语义事实源与 runtime 执行事实源关系。
- 定义 command / runtime / agent / adapter 职责边界。
- 定义总 contract：project.yml、state.json、events.jsonl、lifecycle_decision、sdd-task、sdd-result、delegation、gap、sync-back。
- 定义 phase gate、checkpoint、gap 回流、liveness、artifact validation 的平台机制。
- 定义 Phase 2 AI 工具入口投影接入点。
- 定义 Phase 3 tool/plugin/worktree/concurrency 接入点。
- 定义 Phase 8 代码知识图谱需要提前保留的 graph-ready metadata，并预留 Phase 5 harness metadata handoff、Phase 6 agent/skill runtime metadata 输入和 Phase 7 core module boundary 输入。

## 4. 非目标

- 不重新执行 Phase 1.0 的独立调研、Baseline 对比或 lifecycle decision 定稿。
- 不实现 TypeScript runtime。
- 不实现 CLI。
- 不编写完整 command / agent / workflow 资产。
- 不执行 agent 调度。
- 不实现 plugin loader、tool registry、worktree 或代码知识图谱。

## 5. 交付物

- `docs/architecture/lifecycle-decision-model.md`
  - Final Lifecycle Decision Model
  - profile routing algorithm
  - lifecycle decision architecture handoff
  - Phase 1.1 需要处理的 open gaps
- `docs/research/lifecycle-decision-model-research.md`
  - Baseline Draft 封存、外部机制调研、Independent Research Model 和 Baseline 对比
- `docs/architecture/sdd-agent-platform-architecture.md`
  - 架构分层
  - lifecycle decision 设计边界
  - contract 总览
  - phase 路线映射
  - ADR
- `specs/master/phases/phase-1.1-architecture-baseline.md`
- Phase 1.2+ 的依赖前置条件说明

## 6. 验收标准

- Phase 1.0 的 Final Model、routing algorithm 和 architecture handoff 已被吸收到 architecture baseline。
- lifecycle decision 的输入信号、profile routing、confidence、hard gates、升级/降级和误判控制在全平台架构中有明确位置。
- 明确哪些 lifecycle decision 内容进入 Phase 1.2 record contract，哪些内容到 Phase 1.7 command gate 才执行。
- 后续 Phase 1.2~1.10 都能映射到清晰架构层。
- 每个核心 contract 都明确所有者、写入方、读取方、存储位置和演进方式。
- 明确哪些逻辑必须在 TypeScript runtime，哪些只属于 Claude Code command/agent prompt。
- 明确 Phase 8 代码知识图谱如何消费 Phase 1/2/3/4 的 metadata、Phase 5 harness metadata、Phase 6 agent/skill runtime metadata 和 Phase 7 core module boundary metadata。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.1-architecture-baseline.md
research_artifact: docs/research/lifecycle-decision-model-research.md
model_artifact: docs/architecture/lifecycle-decision-model.md
architecture_artifact: docs/architecture/sdd-agent-platform-architecture.md
required_by:
  - phase-1.2-runtime-skeleton
  - phase-1.3-contract-templates-adapters
  - phase-1.4-commands-agents-workflows
  - phase-1.7-claude-code-command-integration
  - phase-1.10-real-project-trial
```

# Phase Artifacts Index

本目录保存当前分支的独立 phase artifact。每个小 phase 都有自己的文件，执行过程中可以独立调整目标、范围、非目标、交付物、验收标准、依赖与下游引用。

总方案和架构文档只引用这些 artifact，不复制完整内容，避免 phase 内容在多个文档中漂移。

## Phase 1

| Phase | Artifact | Status | 定位 |
|---|---|---|---|
| 1.0 | [phase-1.0-lifecycle-research.md](phase-1.0-lifecycle-research.md) | [status](PHASE_STATUS.md) | Lifecycle Decision Model 调研、对比与定稿 |
| 1.1 | [phase-1.1-architecture-baseline.md](phase-1.1-architecture-baseline.md) | [status](PHASE_STATUS.md) | 架构基线 |
| 1.2 | [phase-1.2-runtime-skeleton.md](phase-1.2-runtime-skeleton.md) | [status](PHASE_STATUS.md) | Runtime 骨架 |
| 1.3 | [phase-1.3-contract-templates-adapters.md](phase-1.3-contract-templates-adapters.md) | [status](PHASE_STATUS.md) | Contract / Templates / Adapters Pack |
| 1.4 | [phase-1.4-commands-agents-workflows.md](phase-1.4-commands-agents-workflows.md) | [status](PHASE_STATUS.md) | Commands / Agents / Workflows Pack |
| 1.5 | [phase-1.5-sdd-parser-task-model.md](phase-1.5-sdd-parser-task-model.md) | [status](PHASE_STATUS.md) | SDD 文档读取与 Task 模型 |
| 1.6 | [phase-1.6-artifact-delegation-contract.md](phase-1.6-artifact-delegation-contract.md) | [status](PHASE_STATUS.md) | Artifact 与 Delegation Contract |
| 1.7 | [phase-1.7-claude-code-command-integration.md](phase-1.7-claude-code-command-integration.md) | [status](PHASE_STATUS.md) | Claude Code 命令接入 |
| 1.8 | [phase-1.8-single-task-loop.md](phase-1.8-single-task-loop.md) | [status](PHASE_STATUS.md) | 单 Task 执行闭环 |
| 1.9 | [phase-1.9-goal-verify-doctor.md](phase-1.9-goal-verify-doctor.md) | [status](PHASE_STATUS.md) | Goal-level Verify 与 Doctor 加固 |
| 1.10 | [phase-1.10-real-project-trial.md](phase-1.10-real-project-trial.md) | [status](PHASE_STATUS.md) | 真实项目验收试跑 |

## Phase 2

| Phase | Artifact | Status | 定位 |
|---|---|---|---|
| 2.0 | [phase-2.0-ai-tool-entry-projection.md](phase-2.0-ai-tool-entry-projection.md) | [status](PHASE_STATUS.md) | AI 工具入口投影执行基线与小阶段拆分 |
| 2.1 | [phase-2.1-global-cli-install.md](phase-2.1-global-cli-install.md) | [status](PHASE_STATUS.md) | 全局 CLI 安装与 package/bin 硬化 |
| 2.2 | [phase-2.2-ai-tool-adapter-registry.md](phase-2.2-ai-tool-adapter-registry.md) | [status](PHASE_STATUS.md) | AI Tool Adapter Registry 与 Claude Code Adapter |
| 2.3 | [phase-2.3-init-update-generated-entries.md](phase-2.3-init-update-generated-entries.md) | [status](PHASE_STATUS.md) | Init / Update Generated Entries 闭环 |
| 2.4 | [phase-2.4-instruction-api-thin-entries.md](phase-2.4-instruction-api-thin-entries.md) | [status](PHASE_STATUS.md) | Instruction API 与薄入口改造 |
| 2.5 | [phase-2.5-detector-registry.md](phase-2.5-detector-registry.md) | [status](PHASE_STATUS.md) | Detector Registry 与 Mixed Stack 识别 |
| 2.6 | [phase-2.6-doctor-drift-check.md](phase-2.6-doctor-drift-check.md) | [status](PHASE_STATUS.md) | Doctor Drift Check 与 Update Check 模式 |
| 2.7 | [phase-2.7-entry-projection-e2e.md](phase-2.7-entry-projection-e2e.md) | [status](PHASE_STATUS.md) | 安装到入口投影 E2E 验收 |
| 2.8 | [phase-2.8-workflow-ux-status-syncback.md](phase-2.8-workflow-ux-status-syncback.md) | [status](PHASE_STATUS.md) | Workflow UX / Status / Run Inspect / Sync-back Hardening |
| 2.9 | [phase-2.9-claude-code-workflow-command-hardening.md](phase-2.9-claude-code-workflow-command-hardening.md) | [status](PHASE_STATUS.md) | Claude Code Workflow Command Hardening |
| 2.10 | [phase-2.10-init-onboarding-scaffold-hardening.md](phase-2.10-init-onboarding-scaffold-hardening.md) | [status](PHASE_STATUS.md) | Init Onboarding Scaffold Hardening |
| 2.11 | [phase-2.11-artifact-run-hygiene-hardening.md](phase-2.11-artifact-run-hygiene-hardening.md) | [status](PHASE_STATUS.md) | Artifact UX and Run Hygiene Hardening |

## Phase 3

| Phase | Artifact | Status | 定位 |
|---|---|---|---|
| 3.0 | [phase-3.0-platform-extension-baseline.md](phase-3.0-platform-extension-baseline.md) | [status](PHASE_STATUS.md) | Platform Extension Baseline |
| 3.1 | [phase-3.1-tool-capability-registry-baseline.md](phase-3.1-tool-capability-registry-baseline.md) | [status](PHASE_STATUS.md) | Tool / Capability Registry Baseline |
| 3.2 | [phase-3.2-tool-plugin-loading-contract.md](phase-3.2-tool-plugin-loading-contract.md) | [status](PHASE_STATUS.md) | Tool / Plugin Loading Contract |
| 3.3 | [phase-3.3-delegation-queue-contract.md](phase-3.3-delegation-queue-contract.md) | [status](PHASE_STATUS.md) | Delegation Queue Contract |
| 3.4 | [phase-3.4-delegation-state-machine.md](phase-3.4-delegation-state-machine.md) | [status](PHASE_STATUS.md) | Delegation State Machine |
| 3.5 | [phase-3.5-worker-adapter-contract.md](phase-3.5-worker-adapter-contract.md) | [status](PHASE_STATUS.md) | Worker Adapter Contract |
| 3.6 | [phase-3.6-artifact-result-ingestion.md](phase-3.6-artifact-result-ingestion.md) | [status](PHASE_STATUS.md) | Artifact Result Ingestion |
| 3.7 | [phase-3.7-worktree-isolation-contract.md](phase-3.7-worktree-isolation-contract.md) | [status](PHASE_STATUS.md) | Worktree Isolation Contract |
| 3.8 | [phase-3.8-worktree-lifecycle-manager.md](phase-3.8-worktree-lifecycle-manager.md) | [status](PHASE_STATUS.md) | Worktree Lifecycle Manager |
| 3.9 | [phase-3.9-task-graph-planner.md](phase-3.9-task-graph-planner.md) | [status](PHASE_STATUS.md) | Task Graph Planner |
| 3.10 | [phase-3.10-wave-planner.md](phase-3.10-wave-planner.md) | [status](PHASE_STATUS.md) | Wave Planner |
| 3.11 | [phase-3.11-background-executor.md](phase-3.11-background-executor.md) | [status](PHASE_STATUS.md) | Background Executor |
| 3.12 | [phase-3.12-wave-executor.md](phase-3.12-wave-executor.md) | [status](PHASE_STATUS.md) | Wave Executor |
| 3.13 | [phase-3.13-local-run-index.md](phase-3.13-local-run-index.md) | [status](PHASE_STATUS.md) | Local Run Index |
| 3.14 | [phase-3.14-governance-policy.md](phase-3.14-governance-policy.md) | [status](PHASE_STATUS.md) | Governance Policy |
| 3.15 | [phase-3.15-workflow-entrypoint-unification.md](phase-3.15-workflow-entrypoint-unification.md) | [status](PHASE_STATUS.md) | Workflow Entrypoint Unification |

## 引用规则

- phase 的可执行边界以本目录下对应文件为准。
- 每个 phase 的 `spec / plan / tasks / validation` 必须按 phase 短命名留存在 `specs/master/`，例如 `phase1.0-spec.md`。
- 顶层 `spec.md / plan.md / tasks.md / validation.md` 只作为索引入口，不作为可覆盖的执行文档。
- phase 执行中如果目标、范围或验收变化，优先更新对应 phase artifact，再同步该 phase 命名的 spec/plan/tasks/validation。
- 上游总方案和架构文档只维护索引、顺序和关键原则，不复制每个 phase 的完整细节。

## 命名与位置规范

- 每个小 phase 一个独立 artifact，统一放在 `specs/master/phases/`。
- 文件命名使用 `phase-<major>.<minor>-<kebab-title>.md`，例如 `phase-1.5-sdd-parser-task-model.md`。
- `docs/research/` 和 `docs/architecture/` 只维护战略、架构原则和 phase artifact 索引；不作为具体 phase 的执行边界。
- phase 命名执行文档放在 `specs/master/`，命名为 `phase<major>.<minor>-<spec|plan|tasks|validation>.md`。

## Phase Artifact 必备结构

每个 phase artifact 至少包含：

1. 定位
2. 依赖
3. 范围
4. 非目标
5. 交付物
6. 验收标准
7. 可被下游引用的产物

## 依赖元数据语义

- `depends_on`：当前 phase 的直接前置 phase，只列必须完成后才能进入本 phase 的 artifact。
- `blocks`：当前 phase 直接阻塞的下游 phase，必须等于其他 phase `depends_on` 中直接引用当前 phase 的反向集合。
- `required_by`：当前产物的直接消费者，语义与 `blocks` 保持一致；跨大阶段的未来消费者不要混入当前 phase dependency graph。phase 完成状态见 `PHASE_STATUS.md`。
- `next_phase_candidate`：用于表达 Phase 1.10 之后可能进入的下一大阶段，不参与 Phase 1 内部倒置检查。
- 依赖图只表达直接依赖，不写 transitive closure；需要传递关系时由图遍历推导。

## Phase 1 直接依赖矩阵

| Phase | depends_on | blocks / required_by |
|---|---|---|
| 1.0 | `[]` | 1.1, 1.10 |
| 1.1 | 1.0 | 1.2, 1.3, 1.4, 1.7, 1.10 |
| 1.2 | 1.1 | 1.3, 1.5, 1.6, 1.7, 1.8, 1.10 |
| 1.3 | 1.1, 1.2 | 1.4, 1.5, 1.6, 1.9, 1.10 |
| 1.4 | 1.1, 1.3 | 1.7, 1.8, 1.9, 1.10 |
| 1.5 | 1.2, 1.3 | 1.7, 1.8, 1.9, 1.10 |
| 1.6 | 1.2, 1.3 | 1.8, 1.9, 1.10 |
| 1.7 | 1.1, 1.2, 1.4, 1.5 | 1.8, 1.9, 1.10 |
| 1.8 | 1.2, 1.4, 1.5, 1.6, 1.7 | 1.9, 1.10 |
| 1.9 | 1.3, 1.4, 1.5, 1.6, 1.7, 1.8 | 1.10 |
| 1.10 | 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9 | `[]` |

## 文档引用关系

- `docs/research/自建_SDD_subagent_工作流平台方案.md`：维护总体路线、Phase 1 小阶段索引和 Phase 2/3/4 战略边界。
- `docs/architecture/sdd-agent-platform-architecture.md`：维护架构边界、contract 总览、Phase 1 路线映射和 Phase 2/3/4 接入点。
- `docs/research/lifecycle-decision-model-research.md`：维护 Phase 1.0 的 lifecycle decision research、Baseline 对比、Final Model、routing algorithm 和 architecture handoff。
- `specs/master/phases/*.md`：维护每个小 phase 的目标、范围、非目标、交付物、验收标准和直接依赖。
- `specs/master/phase*-{spec,plan,tasks,validation}.md`：维护每个 phase 的执行 spec、plan、tasks 和 validation，按 phase 短命名留存。
- `specs/master/spec.md`、`specs/master/plan.md`、`specs/master/tasks.md`、`specs/master/validation.md`：只维护索引，不承载可被覆盖的当前 phase 内容。
- 下游文档引用上游产物时使用 artifact 路径，不复制完整 phase 内容。
- `specs/master/phases/PHASE_STATUS.md`：维护每个 phase 的执行状态，完成验证后必须更新。

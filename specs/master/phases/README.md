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

## Phase 4

| Phase | Artifact | Status | 定位 |
|---|---|---|---|
| 4.0 | [phase-4.0-npm-package-distribution.md](phase-4.0-npm-package-distribution.md) | [status](PHASE_STATUS.md) | NPM Package Distribution / Public Install Baseline |
| 4.1 | [phase-4.1-package-metadata-hardening.md](phase-4.1-package-metadata-hardening.md) | [status](PHASE_STATUS.md) | Package Metadata Hardening |
| 4.2 | [phase-4.2-package-contents-install-smoke.md](phase-4.2-package-contents-install-smoke.md) | [status](PHASE_STATUS.md) | Package Contents and Install Smoke |
| 4.3 | [phase-4.3-npm-publish-dry-run-runbook.md](phase-4.3-npm-publish-dry-run-runbook.md) | [status](PHASE_STATUS.md) | NPM Publish Dry-run and Human Runbook |
| 4.4 | [phase-4.4-public-publish-adoption.md](phase-4.4-public-publish-adoption.md) | [status](PHASE_STATUS.md) | Public Publish and Adoption |

## Phase 5

| Phase | Artifact | Status | 定位 |
|---|---|---|---|
| 5.0 | [phase-5.0-source-architecture-localization.md](phase-5.0-source-architecture-localization.md) | [status](PHASE_STATUS.md) | SDD Harness Engineering Reframe and Contract Freeze：完成定位重构、contract freeze、no-OS guardrail 和拆分路线 |
| 5.1 | [phase-5.1-context-risk-output-harness.md](phase-5.1-context-risk-output-harness.md) | [status](PHASE_STATUS.md) | Context / Risk / Output Harness：branch context、risk extraction、autonomy decision、输出结构 |
| 5.2 | [phase-5.2-workflow-agent-registry-harness.md](phase-5.2-workflow-agent-registry-harness.md) | [status](PHASE_STATUS.md) | Workflow / Agent Registry Harness：workflow gate、agent registry、slash command agent evidence |
| 5.3 | [phase-5.3-task-graph-run-evidence-harness.md](phase-5.3-task-graph-run-evidence-harness.md) | [status](PHASE_STATUS.md) | Task Graph / Run Evidence Harness：task graph、agent_fit、verification availability、run evidence、verifier |
| 5.4 | [phase-5.4-managed-assets-query-status-harness.md](phase-5.4-managed-assets-query-status-harness.md) | [status](PHASE_STATUS.md) | Managed Assets / Query Status Harness：managed manifest、doctor drift、status/doctor/run inspect/debug 边界 |
| 5.5 | [phase-5.5-eval-learning-context-pack-harness.md](phase-5.5-eval-learning-context-pack-harness.md) | [status](PHASE_STATUS.md) | Eval / Learning / Context Pack Harness：ERP trial eval、HarnessLearning、Project Context Pack |
| 5.6 | [phase-5.6-phase7-graph-handoff-hardening.md](phase-5.6-phase7-graph-handoff-hardening.md) | [status](PHASE_STATUS.md) | Phase 7 Graph Handoff Hardening：graph-ready harness metadata，不实现图谱 |
| 5.7 | [phase-5.7-hardening-regression-gate.md](phase-5.7-hardening-regression-gate.md) | [status](PHASE_STATUS.md) | Hardening / Regression Gate：真实 ERP 回归、agent evidence 叙事、对外 demo 对比 |
| 5.8 | [phase-5.8-semantic-document-contracts.md](phase-5.8-semantic-document-contracts.md) | [status](PHASE_STATUS.md) | Semantic Document Contracts：spec 需求契约、plan 技术方案桥接、tasks 执行证据契约 |
| 5.9 | [phase-5.9-task-contract-parser-inspect.md](phase-5.9-task-contract-parser-inspect.md) | [status](PHASE_STATUS.md) | Task Contract Parser / Inspect：task refs、agent/artifact/verification/autonomy 字段进入 runtime 可见性 |
| 5.10 | [phase-5.10-document-chain-verify-doctor.md](phase-5.10-document-chain-verify-doctor.md) | [status](PHASE_STATUS.md) | Document Chain Verify / Doctor：spec -> plan -> tasks -> artifacts 的验收链路检查 |

## Phase 6

| Phase | Artifact | Status | 定位 |
|---|---|---|---|
| 6.0 | [phase-6.0-agent-skill-runtime-harness.md](phase-6.0-agent-skill-runtime-harness.md) | [status](PHASE_STATUS.md) | Agent / Skill / Team Runtime Harness：借鉴 Oh My OpenAgent/OpenCode 等开源轮子的 agent team/category/model/background/skill/team-mode 机制，但由 SDD contract、risk gate、evidence、tool permission 和 host adapter 控制，不重造 OpenCode/Claude Code/plugin/MCP/team runtime |
| 6.1 | [phase-6.1-resident-agent-worker-runtime.md](phase-6.1-resident-agent-worker-runtime.md) | [status](PHASE_STATUS.md) | Resident Agent Worker Runtime：在 Phase 6.0 router/team metadata 之上增加 worker claim、lease、heartbeat、status、inspect、run evidence 和 doctor stale visibility，不实现 daemon/tmux/远程 worker fleet |
| 6.2 | [phase-6.2-rc-stabilization.md](phase-6.2-rc-stabilization.md) | [status](PHASE_STATUS.md) | RC Stabilization：在 Phase 7.0 code graph 前收口 core/CLI/test 维护边界、CLI UX、package hygiene 和 release-candidate validation，不扩新功能 |
| 6.3 | [phase-6.3-declarative-agent-skill-capability-runtime.md](phase-6.3-declarative-agent-skill-capability-runtime.md) | [status](PHASE_STATUS.md) | Declarative Agent/Skill Capability Runtime：将内置 agent/skill/source catalog 扩展为 built-in + project-config merged registry，支持非内置 agent/skill 的可校验调度，不导入任意 prompt |
| 6.4 | [phase-6.4-spec-partition-entry.md](phase-6.4-spec-partition-entry.md) | [status](PHASE_STATUS.md) | Spec Partition Entry：`/sdd:spec` 作为工作流分区入口，解析当前 Git branch 或显式 branch，`status` 只读查看分区状态，支持 spec revision/stale 检测 |
| 6.5 | [phase-6.5-parallel-branch-run-isolation.md](phase-6.5-parallel-branch-run-isolation.md) | [status](PHASE_STATUS.md) | Parallel Branch Run Isolation：run 绑定 partition/gitBranch/task/document snapshot，partition+task 查找 latest run，并保护 stale/wrong-branch/affectedFiles 冲突 |
| 6.6 | [phase-6.6-documentation-information-architecture.md](phase-6.6-documentation-information-architecture.md) | [status](PHASE_STATUS.md) | Documentation Information Architecture：进入 Phase 7 前冻结文档分类、迁移风险、runtime/generated/archive 边界和验证门禁，真实安装运行 SDD workflow 产出证据 |
| 6.7 | [phase-6.7-token-budget-output-dedup-runtime.md](phase-6.7-token-budget-output-dedup-runtime.md) | [status](PHASE_STATUS.md) | Token Budget and Output Dedup Runtime：集中 CLI JSON/compact 输出路径，减少 runtime renderer/instruction/evidence 重复输出，不改变机器可读合同 |
| 6.8 | [phase-6.8-project-document-language-runtime.md](phase-6.8-project-document-language-runtime.md) | [status](PHASE_STATUS.md) | Project Document Language Runtime：使用同一个项目级 `docs_language` 控制 SDD 文档 prose，runtime/CLI/JSON/contract 继续英文稳定 |
| 6.9 | [phase-6.9-runtime-trust-fast-path-hardening.md](phase-6.9-runtime-trust-fast-path-hardening.md) | [status](PHASE_STATUS.md) | Runtime Trust Layer and Fast Path Hardening：CER/PROV/attestation/policy 证据可信模型、真实项目 PASS 证据质量、policy-backed coverage、per-delegation routing、invocation ledger、sync-back 单调状态、doctor trust checks、命令 profiling/derived fast path 和 team-mode cost routing |
| 6.10 | [phase-6.10-context-budget-runtime-log-workers.md](phase-6.10-context-budget-runtime-log-workers.md) | [status](PHASE_STATUS.md) | Context Budget Runtime and Non-authoritative Log Workers：context profile、hash-backed evidence summary、context build、命令输出摘要、非权威 log worker/subagent 边界和输出预算回归 |

## Phase 7

| Phase | Artifact | Status | 定位 |
|---|---|---|---|
| 7.0 | [phase-7.0-code-knowledge-graph-baseline.md](phase-7.0-code-knowledge-graph-baseline.md) | [status](PHASE_STATUS.md) | 原代码知识图谱方向顺延，消费 Phase 5 graph-ready metadata、Phase 5.10 document-chain evidence、Phase 6 agent/skill/team runtime metadata、Phase 6.1 resident worker runtime evidence、Phase 6.2 RC validation evidence、Phase 6.3 merged runtime registry evidence、Phase 6.4 partition/revision evidence、Phase 6.5 partition-aware run isolation evidence、Phase 6.6 documentation IA evidence、Phase 6.7 output dedup evidence、Phase 6.8 document language evidence、Phase 6.9 policy-proven runtime trust / structured evidence graph / fast-path evidence 和 Phase 6.10 context budget / non-authoritative projection evidence |
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

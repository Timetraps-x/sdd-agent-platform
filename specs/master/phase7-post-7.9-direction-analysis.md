# Phase 7.9 完成后的改动方向与分叉分析

## 1. 背景

Phase 7.9 已完成，当前平台已经具备以下基础能力：

- 核心 runtime 模块化与 core subpath boundary。
- Runtime Storage v2 与 SQLite-first 结构化状态。
- Workflow State Resolver 与快速状态读取路径。
- verification contract 与 `/sdd:test` 测试运行时；后续用户侧入口收敛到 `/sdd:test`。
- agent capability catalog 与 command-scoped team runtime。
- sync-back / ship / observability 基础。
- Phase 7.9 的 workflow semantics、risk、context/token runtime hardening。

但 Phase 7.9 完成后的多轮复盘和调研表明，当前实现仍存在若干方向性分叉。部分能力虽然已有命名或初始结构，但语义与目标需要纠偏：尤其是 context/token 优化、subagent 形态、workflow stage agent handoff、coding risk decision 与 `/sdd:` 命令简洁性。

本文从 Phase 7.9 已 complete 的状态开始，整理后续可能涉及的改动方向、目标、分叉与优先级。本文不是最终实施计划，而是后续 Phase 7.x/8.x 拆分前的方向收敛材料。

## 2. 已确认的纠偏点

### 2.1 `/sdd:` 工作流要保持简单

用户侧 `/sdd:` lifecycle 不应暴露过细内部 gate。

推荐用户侧主路径：

```text
/sdd:spec
/sdd:plan
/sdd:tasks
/sdd:do
/sdd:test
/sdd:sync-back
status / doctor / statusline / ship
```

其中：

- `/sdd:test`：用户侧统一入口，负责验证契约 preflight、测试命令执行、evidence 收集，并完成 evidence 是否证明 AC 的判断。
- `sdd verifies inspect|write`：保留为低层 CLI/诊断能力，可由 `/sdd:test` 内部调用，不投影为主要 slash lifecycle 入口。
- standalone `/sdd:verify` 不应作为主 lifecycle slash command 暴露；如果保留，应定位为内部 CLI runtime 能力或兼容入口。

### 2.2 context/token 预算路线需要纠偏

Phase 7.9 中的 context budget、token health、trimming、pressure projection 能证明 runtime 已经能观察和保护上下文压力，但它们不应继续作为 context/token 优化主路线。

后续应避免继续围绕以下词汇扩展主模型：

```text
ContextBudget
TokenHealth
token optimization by trimming
budget-first context routing
```

更准确的方向是：

```text
Subagent-based Context Offload
Context Delegation
Context Load Signal
Delegation Pressure Signal
Scoped Context Handoff
```

预算/压力指标如果保留，应降级为：

- 判断是否需要拆 subagent 的信号。
- 单个 subagent 上下文过载的 guardrail。
- doctor/statusline 的诊断信息。
- 非主优化目标。

### 2.3 subagent 形态偏向 Claude 官方模式

本项目期望的 subagent 更接近 Claude Code 官方 subagent：

```text
隔离上下文
独立 system prompt
独立 tools / disallowedTools / permission boundary
可后台/并行执行
结果返回主流程
```

明确边界：

- subagent 不负责生产代码改写。
- subagent 不应默认在独立 worktree 工作。
- subagent 可以写测试代码。
- subagent 可以做调研、阅读、分析、review、诊断、验证复核、测试代码编写、上下文整理。
- subagent 不拥有 SDD lifecycle 控制权。
- subagent 输出应以 summary / artifact / evidence refs 回流主流程。

### 2.4 OpenAI handoff 应用于 workflow stage agent 交接，而不是默认 subagent

OpenAI Agents SDK 的 handoff 模型适合表示：

```text
active agent 完成自己阶段后，把控制权交给下一个 specialist agent
```

这与 SDD workflow stage agents 适配：

```text
spec-agent -> plan-agent -> tasks-agent -> do-agent -> test-agent -> sync-back/release-agent
```

但这不等同于 subagent。后续需要区分：

```text
workflow stage agent handoff = 生命周期阶段控制权交接
Claude-style subagent dispatch = 阶段内局部任务并行/后台/隔离执行
```

### 2.5 风险决策模型不要与 agent 模型混在一起

风险决策模型属于 SDD lifecycle / policy engine，不属于 agent-team 模型。

它应先回答：

```text
当前 coding 变更应走多深的 SDD 生命周期？
哪些阶段 required / skipped / blocked？
需要哪些 evidence、checks、review、approval？
sync-back / ship 是否允许？
```

agent / subagent runtime 可以消费风险决策结果，但风险模型本身不应直接内嵌 agent 编排逻辑。

## 3. 后续方向总览

当前至少存在六条主要改动方向：

| 方向 | 核心目标 | 当前状态 | 是否互斥 |
|---|---|---|---|
| A. Slash lifecycle cleanup | 简化 `/sdd:`，将 test+verify 统一到 `/sdd:test` | 已确认纠偏，未实施 | 不互斥 |
| B. Lifecycle risk decision engine | 将 coding 风险转成 SDD lifecycle depth / gates / evidence | 有 `TaskRiskProfile`，但语义仍偏 task/router | 不互斥，优先级高 |
| C. Workflow stage agent handoff | 阶段 active agent 完成后交权给下一 specialist agent | 概念未完全落地 | 与 D 分层互补 |
| D. Claude-style subagent dispatch | 并行、非阻塞、上下文隔离的局部 worker | 有角色/能力 catalog，但没有完整 dispatch runtime | 与 C 分层互补 |
| E. Context offload / delegation | 用 subagent 防止主上下文膨胀 | Phase 7.9 仍偏预算/pressure，需要重命名纠偏 | 依赖 D |
| F. Code graph / test impact / context selection | 用代码图谱支持风险、验证范围、context scope | Phase 8.0 planned | 支撑 B/D/E |

## 4. 分叉一：风险决策先行，还是 agent handoff 先行

### 4.1 路线 B-first：先做 lifecycle risk decision

核心思想：

```text
coding change facts
  -> CodingRiskProfile
  -> LifecycleRiskDecision
  -> required SDD depth / stages / evidence / blockers
```

目标：

- 将风险模型从 agent/team/runtime 中剥离出来。
- 建立 coding 风险事实层：diff、path、owner、test impact、CI、security、dependency、release。
- 输出 lifecycle decision，而不是 agent decision。
- 驱动 adaptive lifecycle：direct / compact / full / research 等最短安全路径。

推荐结构：

```ts
interface CodingRiskSignal {
  source: 'diff' | 'path-rule' | 'dependency-graph' | 'test-impact' | 'code-owner' | 'ci' | 'sast' | 'sca' | 'workflow' | 'release' | 'sdd-contract';
  kind: 'source-change' | 'test-change' | 'docs-change' | 'public-api-change' | 'schema-change' | 'dependency-change' | 'ci-change' | 'release-change' | 'security-finding' | 'missing-test' | 'failed-check' | 'stale-evidence' | 'ownership-required' | 'provenance-required';
  severity: 'info' | 'warning' | 'high' | 'blocking';
  confidence: 'low' | 'medium' | 'high';
  refs: string[];
  message: string;
}

interface CodingRiskProfile {
  target: 'request' | 'spec' | 'plan' | 'task' | 'change' | 'test' | 'sync-back' | 'ship';
  level: 'low' | 'medium' | 'high' | 'blocked';
  dimensions: {
    docsOnly: boolean;
    testOnly: boolean;
    productionCodeChanged: boolean;
    publicApiChanged: boolean;
    schemaChanged: boolean;
    dependencyChanged: boolean;
    ciChanged: boolean;
    releasePathChanged: boolean;
    securitySensitive: boolean;
    runtimeStateChanged: boolean;
    evidenceGap: boolean;
    staleEvidence: boolean;
    validationFailed: boolean;
    provenanceMissing: boolean;
  };
  signals: CodingRiskSignal[];
  reasons: string[];
}

interface LifecycleRiskDecision {
  decision: 'allow' | 'warn' | 'require_spec' | 'require_plan' | 'require_tasks' | 'require_validation' | 'require_review' | 'require_human_checkpoint' | 'block';
  lifecycleDepth: 'direct' | 'spec-lite' | 'plan-lite' | 'task-bound' | 'full-sdd' | 'blocked';
  requiredStages: Array<'spec' | 'plan' | 'tasks' | 'verifies' | 'do' | 'test' | 'sync-back' | 'ship'>;
  requiredEvidence: string[];
  blockedStages: Array<'do' | 'test' | 'sync-back' | 'ship'>;
  reasons: string[];
}
```

优点：

- 直接修正“风险模型和 agent 混在一起”的问题。
- 为 workflow handoff 和 subagent dispatch 提供上游依据。
- 与项目早期 adaptive lifecycle 原则一致。
- 可先不碰 agent runtime，风险较低。

缺点：

- 不会马上解决 subagent 并行和主上下文膨胀问题。
- 需要重新梳理已有 `TaskRiskProfile` 与 router/sync-back/ship 的关系。

适合作为下一步优先方向。

### 4.2 路线 C/D-first：先做 workflow handoff + subagent dispatch

核心思想：

```text
阶段 agent 之间 handoff
阶段内部 subagent 并行/后台执行
```

优点：

- 直接贴近用户对 agent/subagent 的目标：并行、非阻塞、上下文隔离。
- 能快速纠偏 context/token 预算路线。
- 能为后续 Phase 8 code graph/context offload 提供执行载体。

缺点：

- 如果风险决策还不清楚，容易再次把 agent 编排和 policy 混在一起。
- 容易产生“谁能推进 workflow”的权威边界混乱。
- 可能需要同时改动 registry、runtime、run-state、artifact、CLI，范围较大。

适合在 B 的基础模型明确后推进。

### 4.3 建议

建议先走：

```text
B. Lifecycle risk decision engine
  -> C. Workflow stage handoff
  -> D/E. Claude-style subagent dispatch + context offload
```

原因：风险决策是 lifecycle gate 的基础，先建立清楚后，agent/handoff/subagent 只消费它，不会再次混层。

## 5. 分叉二：workflow handoff 与 subagent dispatch 的边界

### 5.1 Workflow stage handoff

适用对象：主生命周期阶段 agent。

```text
spec-agent
plan-agent
tasks-agent
do-agent
test-agent
sync-back/release-agent
```

语义：

```text
当前 active agent 完成阶段输出后，把阶段控制权交给下一个 specialist agent。
```

建议结构：

```ts
interface WorkflowHandoff {
  contract: 'sdd-workflow-handoff-v1';
  runId: string;
  branch: string;
  fromStage: 'spec' | 'plan' | 'tasks' | 'verifies' | 'do' | 'test' | 'sync-back';
  toStage: 'plan' | 'tasks' | 'verifies' | 'do' | 'test' | 'sync-back' | 'ship';
  fromAgent: string;
  toAgent: string;
  outputRefs: string[];
  requiredInputRefs: string[];
  openQuestions: string[];
  blockingGaps: string[];
  riskDecisionRef?: string;
  createdAt: string;
}
```

关键问题：

- 每个 stage 是否只有一个 active agent，还是允许多个 co-main agents？
- handoff 是否必须经过 lifecycle risk decision gate？
- 下一个 stage agent 是否可以 reject handoff？
- handoff packet 是否进入 run artifact / projection？

### 5.2 Subagent dispatch

适用对象：阶段内部并行/后台局部任务 worker。

目标：

1. 并行提升效率。
2. 非阻塞后续工作流的任务由 subagent 处理，主 agent 继续做其他事。
3. 防止主 context 很快被刷满。

建议结构：

```ts
interface SubagentDefinition {
  name: string;
  description: string;
  tools?: string[];
  disallowedTools?: string[];
  model?: string;
  permissionMode?: string;
  skills?: string[];
  mayEditProductionCode: false;
  mayWriteTests: boolean;
}

interface SubagentDispatch {
  contract: 'sdd-subagent-dispatch-v1';
  id: string;
  runId: string;
  parentStage: 'spec' | 'plan' | 'tasks' | 'verifies' | 'do' | 'test' | 'sync-back' | 'ship';
  parentAgent: string;
  subagentName: string;
  purpose: string;
  mode: 'foreground' | 'background';
  blocking: boolean;
  requiredBefore: 'current-stage-output' | 'handoff' | 'sync-back' | 'ship' | 'never';
  contextRefs: string[];
  expectedOutput: 'research-summary' | 'codebase-scout-report' | 'risk-review' | 'test-diagnosis' | 'evidence-check' | 'test-code' | 'doc-check';
  createdAt: string;
}

interface SubagentResult {
  contract: 'sdd-subagent-result-v1';
  dispatchId: string;
  status: 'completed' | 'blocked' | 'failed';
  summaryRef: string;
  artifactRefs: string[];
  evidenceRefs: string[];
  gaps: string[];
  recommendations: string[];
  authoritative: false;
}
```

关键问题：

- subagent 结果是否允许成为 PASS evidence？默认不允许，除非是测试执行/测试代码相关且有明确 evidence policy。
- subagent 可以写测试代码，但不能改生产代码；这要进入 tool/action policy。
- subagent 不使用 independent worktree，避免把它变成 parallel code modifier。
- background subagent 的结果如何晚到后被主流程消费，需要 run event / artifact index 支持。

## 6. 分叉三：context/token 重新命名与模型收敛

### 6.1 当前问题

Phase 7.9 的命名仍然带有：

```text
context budget
token health
token pressure
```

这些命名容易让后续实现继续走预算路线。

### 6.2 推荐改名

建议新模型使用：

```text
ContextLoadSignal
DelegationPressureSignal
ContextOffloadDecision
ScopedContextHandoff
```

语义：

```text
上下文负载高 -> 推荐/要求 subagent offload -> 主 agent 只消费 summary/artifact refs
```

而不是：

```text
token 超预算 -> trim optional materials
```

### 6.3 与 lifecycle risk 的关系

`ContextLoadSignal` 可以是风险信号，但不是 coding 风险核心。

它更适合影响 workflow 执行策略：

```text
large-context-load
  -> dispatch codebase-scout / log-diagnoser / research-subagent
  -> main agent should not ingest raw logs or large docs
```

## 7. 分叉四：Phase 8 code graph 的位置

Phase 8.0 当前计划是 code knowledge graph baseline。多轮调研后，它仍然重要，但它的服务对象需要明确。

### 7.1 可服务的上层模型

Code graph 可以支撑：

- coding risk decision：changed files -> modules -> reverse dependencies -> impacted tests。
- context offload：为 subagent 构建 scoped context。
- validation scope：targeted / module / broad tests。
- ownership/review：path/symbol/module owner routing。
- public API / schema / contract change detection。

### 7.2 分叉

| 路线 | 描述 | 风险 |
|---|---|---|
| Graph-first | 先做 Phase 8 code graph，再补风险/agent | 可能继续缺 lifecycle policy，图谱产出找不到消费点 |
| Risk-first | 先做 lifecycle risk schema，再让 graph 提供信号 | 更符合当前纠偏，但初期图信号较粗 |
| Subagent-first | 先做 context offload，再由 graph 优化 scoped context | 能快速解决上下文问题，但 risk gate 不稳 |

建议：

```text
Risk-first + Graph as signal provider
```

即先定义 risk/lifecycle 消费模型，再推进 Phase 8 code graph 作为高质量信号源。

## 8. 分叉五：现有 Phase 7.9 能力保留还是重构

### 8.1 保留项

Phase 7.9 的以下能力仍然有效：

- side-effect-free help/preflight。
- shared task risk profile 的初始语义。
- scoped run/artifact guard。
- mapped acceptance evidence。
- verify reporting separation。
- shell-safe test execution。
- stale verify refresh。
- role-scoped context package 的非权威边界。
- command-team role/material decision 的静态元数据。

### 8.2 需要重命名/降级的项

```text
ContextBudget -> ContextLoad / ScopedContext accounting
TokenHealth -> DelegationPressure / ContextLoadStatus
Token-aware team runtime -> Context-load-aware dispatch/team routing
```

这些不一定要马上删除，但后续文档和新 API 不应继续强化“预算控制是主目标”。

### 8.3 需要拆分的项

`TaskRiskProfile` 当前承担了 router/team/sync-back/statusline/ship 多面向语义。后续可能需要拆成：

```text
CodingRiskProfile
LifecycleRiskDecision
ExecutionContextLoadSignal
RuntimeReadinessRisk
```

避免一个 profile 同时服务 coding risk、agent routing、context pressure、ship readiness。

## 9. 建议的后续 Phase 拆分草案

### 9.1 Phase 7.10 — Coding Lifecycle Risk Decision

目标：

- 从 agent/team 中剥离 coding 风险模型。
- 定义 `CodingRiskSignal`、`CodingRiskProfile`、`LifecycleRiskDecision`、`SddRiskPolicy`。
- 将现有 `TaskRiskProfile` 的 lifecycle 相关能力迁移/映射到新模型。
- 让 status/doctor/sync-back/ship 消费 lifecycle decision，而不是各自解释风险。

验收：

- 风险模型不包含 agent/subagent 字段。
- 能根据 docs/test/source/API/dependency/CI/security/release 变更输出 lifecycle depth。
- sync-back/ship 能基于 decision block 或 allow。
- focused tests 覆盖 hard blocker、evidence requirement、lifecycle routing。

### 9.2 Phase 7.11 — Workflow Stage Handoff Contract

目标：

- 引入 `WorkflowHandoff`。
- 建模 active stage agent 完成后交权给下一 specialist stage agent。
- 支持一个 stage 多个 main/co-main agents 的 handoff packet，但不引入 subagent 执行。
- handoff 前后由 lifecycle risk decision gate 校验。

验收：

- spec -> plan -> tasks -> do -> test 的 handoff packet 可记录、检查、诊断。
- handoff 缺 required refs / blocking gaps 时阻断下一阶段。
- doctor 能报告 stale/missing handoff。

### 9.3 Phase 7.12 — Claude-style Subagent Dispatch Contract

目标：

- 引入 `SubagentDefinition`、`SubagentDispatch`、`SubagentResult`。
- 明确 subagent 不改生产代码、不独立 worktree、可写测试代码。
- 支持 foreground/background、blocking/non-blocking。
- 结果以 artifact-backed summary 回流。

验收：

- 非阻塞 subagent 可后台记录结果，主流程可继续。
- blocking subagent 未完成时可阻断指定 gate。
- subagent result 默认 non-authoritative。
- test-writer 类 subagent 只能写测试路径。

### 9.4 Phase 7.13 — Context Offload / Delegation Pressure Rename and Runtime

目标：

- 将 context/token 预算主语义改成 context load / delegation pressure。
- 将预算字段降级为 guardrail/accounting。
- 当 context load 高时推荐或要求 subagent offload。
- 主 agent 消费 summary/artifact refs，而不是 raw large context。

验收：

- CLI/statusline/doctor 不再以 `TokenHealth` 作为主概念。
- context load 可以触发 subagent dispatch recommendation。
- 大日志/大文档场景不要求主 agent 直接摄入全部内容。

### 9.5 Phase 8.0 — Code Graph as Risk and Context Signal Provider

目标：

- 建立 code knowledge graph baseline。
- 为 risk decision 提供 changed-file/module/dependency/test-impact 信号。
- 为 subagent scoped context 提供文件/符号/模块选择依据。

验收：

- changed files 能映射 impacted modules/tests。
- public API/core/shared module 风险能由 graph signal 支撑。
- context offload 可以基于 graph 选取 scoped refs。

## 10. 当前推荐主线

综合多轮调研和纠偏，推荐顺序是：

```text
1. Coding Lifecycle Risk Decision
2. Workflow Stage Handoff Contract
3. Claude-style Subagent Dispatch Contract
4. Context Offload / Delegation Pressure Rename and Runtime
5. Code Graph as Risk/Context Signal Provider
6. Slash lifecycle cleanup：/sdd:test 统一 test+verify，移除主生命周期 /sdd:verify
```

其中 slash cleanup 可以单独提前做，因为它是用户体验和命名一致性问题，风险较低。

## 11. 仍未拍板的问题

后续拆 phase 前，还需要明确以下分叉：

1. **Phase 编号策略**：继续 Phase 7.10+，还是将 agent/handoff/context offload 放入 Phase 8 前置？
2. **Workflow stage agent 粒度**：每个 stage 一个 primary agent，还是 stage 内允许多个 co-main agents 并共同形成 handoff？
3. **Risk model 迁移策略**：新建 `CodingRiskProfile` 后，旧 `TaskRiskProfile` 是保留兼容、拆分、还是逐步替换？
4. **Subagent 执行落地方式**：先只做 contract/artifact 模型，还是直接接入 Claude Code subagent definitions？
5. **Background subagent 消费时机**：非阻塞结果是只在 doctor/ship 检查，还是可在后续 stage 动态并入？
6. **测试代码写入边界**：test-writer subagent 可写哪些路径，是否需要 path policy 和 diff preview？

## 12. 结论

Phase 7.9 完成后，平台已经具备 runtime、evidence、sync-back、ship 和基础 team/context 能力，但后续方向不能继续简单沿着“token budget / team role”扩展。

更合理的后续架构收敛是：

```text
风险决策归 lifecycle policy
workflow stage agent 用 handoff 交接控制权
subagent 采用 Claude 官方风格做并行/后台/隔离上下文局部工作
context/token 优化改名并转向 context offload / delegation pressure
code graph 作为 risk/context/test-impact 的信号源
/sdd 用户入口保持简单
```

这几条不是完全互斥，但有依赖顺序。最关键的是先把风险决策模型从 agent 模型中拆出来，再让 workflow handoff 和 subagent dispatch 消费它。

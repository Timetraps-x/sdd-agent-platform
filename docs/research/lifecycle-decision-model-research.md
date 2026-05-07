# Lifecycle Decision Model Research

## 1. 文档定位

本文用于沉淀 lifecycle decision model 的调研、模型设计、算法对比和最终选择。

当前文档已封存一版 **Baseline Draft**：它来自项目目标推导和工程启发式，不是调研验证后的结论。

Baseline Draft 在 Phase 1.0 中只能作为 T4 对比材料使用；T2 外部机制调研和 T3 Independent Research Model 不得把它作为检索提纲、评分模板、章节模板或结论模板。

## 2. 防干扰调研流程

生命周期决策模型是平台核心能力，不能直接把当前启发式草案当成最终算法。

正式调研必须按以下顺序执行：

```text
Step 1: 封存 Baseline Draft
Step 2: 不参考 Baseline Draft，独立调研外部机制
Step 3: 基于调研独立产出 Research Model
Step 4: 将 Research Model 与 Baseline Draft 对比
Step 5: 选择、融合或替换，形成 Final Model
Step 6: 写入 architecture / schemas / Phase 1.7 command contract
```

调研阶段禁止把 Baseline Draft 当作检索提纲或结论模板。调研提纲应来自外部问题域：risk-based testing、change impact analysis、policy engine、adaptive workflow、human-in-the-loop automation、LLM agent failure patterns。

## 3. Baseline Draft：当前启发式模型

### 3.1 状态

```yaml
status: baseline_draft_not_researched
source:
  - project_goal_reasoning
  - engineering_heuristics
  - existing_training_knowledge
validated_by_external_research: false
may_be_replaced: true
sealed_for_phase1_0: true
allowed_usage: phase1.0 T4 baseline comparison only
forbidden_usage: research outline, scoring template, conclusion template
```

### 3.2 核心原则

```text
Sufficient SDD, not maximum SDD.
只做足以安全完成当前需求的规格化，不多做，不少做。
```

模型目标不是 100% 预测正确，而是让误判可控、可解释、可升级、可审计。

### 3.3 候选 Profile

| Profile | 适用场景 | 最短路径 |
|---|---|---|
| direct | 意图明确、风险极低、验证显然的小改 | intent -> implement -> minimal validation |
| compact | 不大但有业务边界、验收或影响面 | intent/mini-spec -> task boundary -> implement -> validation |
| full | 多模块、多 task、高风险或验收复杂 | spec -> plan -> tasks -> do -> verify -> sync-back |
| research | 架构设计、技术选型、外部方案调研 | research -> options -> decision -> architecture artifact -> implementation spec |

### 3.4 候选输入信号

```ts
type LifecycleSignals = {
  intentClarity: "high" | "medium" | "low";
  acceptanceClarity: "high" | "medium" | "low";
  estimatedScope: "tiny" | "small" | "medium" | "large";
  riskTags: RiskTag[];
  specState: "none_needed" | "missing" | "partial" | "complete";
  uncertainty: "low" | "medium" | "high" | "external";
  validationClarity: "clear" | "partial" | "unclear";
  userRequestedProfile?: "direct" | "compact" | "full" | "research";
};

type RiskTag =
  | "api_contract"
  | "database"
  | "auth"
  | "security"
  | "state_machine"
  | "ci"
  | "dependency"
  | "multi_module"
  | "architecture"
  | "data_loss"
  | "concurrency";
```

### 3.5 候选决策输出

```yaml
lifecycle_decision:
  profile: direct | compact | full | research
  model_version: baseline-draft
  confidence: high | medium | low
  score: 0
  hard_gates: []
  risk_tags: []
  required_stages: []
  skipped_stages: []
  reason: []
  escalation_triggers: []
```

### 3.6 候选算法：Hard Gates + Scoring + Confidence + Escalation

```text
1. 收集 signals
2. 应用 hard gates
3. 如果 hard gate 命中，直接选择更严格 profile
4. 如果没有 hard gate，计算 complexity score
5. 根据 score 映射 direct / compact / full / research
6. 生成 confidence、reason、escalation_triggers
7. 执行中发现风险时升级 profile
```

#### Hard Gates

```ts
function applyHardGates(signals: LifecycleSignals): Profile | null {
  if (signals.riskTags.includes("architecture")) {
    return "research";
  }

  if (signals.uncertainty === "external") {
    return "research";
  }

  const fullRiskTags = [
    "api_contract",
    "database",
    "auth",
    "security",
    "state_machine",
    "ci",
    "dependency",
    "data_loss",
    "concurrency",
  ];

  if (signals.riskTags.some((tag) => fullRiskTags.includes(tag))) {
    return "full";
  }

  if (signals.intentClarity === "low") {
    return signals.uncertainty === "high" ? "research" : "compact";
  }

  if (signals.validationClarity === "unclear") {
    return "compact";
  }

  return null;
}
```

#### Scoring

```ts
function scoreLifecycle(signals: LifecycleSignals): number {
  let score = 0;

  score += { high: 0, medium: 1, low: 3 }[signals.intentClarity];
  score += { high: 0, medium: 1, low: 3 }[signals.acceptanceClarity];
  score += { tiny: 0, small: 1, medium: 3, large: 5 }[signals.estimatedScope];
  score += { low: 0, medium: 2, high: 4, external: 99 }[signals.uncertainty];
  score += { clear: 0, partial: 1, unclear: 3 }[signals.validationClarity];
  score += { none_needed: 0, complete: 0, partial: 2, missing: 3 }[signals.specState];

  return score;
}

function profileFromScore(score: number): Profile {
  if (score >= 99) return "research";
  if (score <= 2) return "direct";
  if (score <= 6) return "compact";
  return "full";
}
```

#### Direct 白名单

Baseline Draft 中，`direct` 必须是严格白名单：

```text
intentClarity = high
acceptanceClarity = high
validationClarity = clear
uncertainty = low
estimatedScope = tiny | small
riskTags = []
specState = none_needed | complete
confidence = high
```

只要有一项不满足，就至少进入 `compact`。

### 3.7 候选误判控制

Baseline Draft 承认误判不可避免，靠以下机制控制误判：

- 风险门禁优先于文件数量。
- 验收不清晰不能 direct。
- 架构 / 技术选型先 research，不直接 implement。
- 低置信度先 lightweight scout。
- 执行中发现风险立即升级。
- 决策必须记录 reason、confidence、skipped stages、escalation triggers。
- 用户可以提升严格度；降低严格度不能绕过 hard gates。

### 3.8 候选升级机制

```text
direct -> compact -> full -> research/architecture
```

典型触发条件：

- 实际影响文件超过预估。
- 发现 API、数据库、权限、安全、状态机、构建依赖影响。
- 验收标准变得不明确。
- validation 失败且原因不直接。
- agent 发现 Spec Gap / Plan Gap / Task Gap / Scope Gap。

## 4. Independent Research Model

本节基于外部机制独立产出，不使用第 3 节 Baseline Draft 作为提纲、评分模板或结论模板。

### 4.1 Research evidence notes

| 外部机制 | 可转译机制 | 不直接照搬的点 | 对本项目的设计含义 |
|---|---|---|---|
| Risk-based testing / change management | 按 failure impact、likelihood、criticality、recent change、dependency density 决定验证深度和优先级；风险评估应随理解变化重新评估。 | 测试领域的 risk matrix 不能直接等同于 SDD profile；它只说明验证强度，不说明规格化深度。 | lifecycle decision 必须把 risk 作为优先信号；高风险路径不能因文件少而降级。 |
| Change impact analysis | 根据 change-set、依赖、受影响组件、需求、设计元素和测试映射估计影响面，并据此选择回归范围。 | 早期没有完整代码知识图谱时，impact 只能是分层估计，不能假装精确。 | profile routing 需要 `impact_surface` 与 `impact_confidence`；低置信影响面必须升级或先 scout。 |
| Policy / rule engine | 将 hard gates 与普通评分解耦；应用作为 enforcement point，policy/rule 作为 decision point；每次 decision 记录 input、result、policy version 和 request identity。 | Phase 1 不应引入完整 OPA/Rego 实现；需要先保留可迁移的 decision contract。 | hard gates 必须先于 scoring；lifecycle decision record 需要可审计、可重放、可脱敏。 |
| Adaptive workflow / workflow routing | 当路径、异常分支、人工审批、恢复和重试可以预定义时，workflow 应拥有路径；LLM 只在受控决策点处理不确定性。 | 不把“adaptive”理解成 agent 可以任意改流程；流程自适应仍要有显式状态和 gate。 | direct/compact/full/research 是受控 workflow profile，不是 prompt 自由发挥。 |
| Human-in-the-loop automation | 低置信、高风险、策略冲突、未知输入、工具失败或越权动作触发人工确认；成熟后可从全审批走向抽样/例外审批。 | 不能把 HITL 变成所有步骤都问用户；人工 gate 应和风险、置信度、不可逆性绑定。 | lifecycle decision 必须输出 `human_checkpoint_required`、原因和阻塞项。 |
| LLM agent orchestration failure patterns | 多 agent 失败常见于 workflow 设计弱、agent 目标/假设不一致、缺少任务验证、运行时不确定性传播。 | 不能只靠更强模型解决；需要系统级 uncertainty representation、evolution、adaptation 和审计。 | 低置信、验证不足、跨 agent handoff、artifact 缺失都应触发升级或 checkpoint。 |

### 4.2 Problem framing

Lifecycle decision 不是预测“任务一定会成功”的模型，而是一个 **最短安全路径选择器**：在给定 intent、risk、impact、uncertainty、validation 和 human/policy constraints 后，选择足够安全的 SDD 深度，并生成可审计的决策记录。

它需要同时避免两类误判：

- 过轻：高风险或高不确定任务被 direct/compact 处理，导致缺少 spec、review、validation 或 checkpoint。
- 过重：低风险小改被强制进入 full/research，导致流程成本高于风险收益。

### 4.3 Input signals

Independent Research Model 将输入信号分为八组：

| Signal group | 示例字段 | 作用 |
|---|---|---|
| Intent clarity | `intent_clarity`、`acceptance_clarity` | 判断是否需要先补 spec / ask-user / research。 |
| Change scale | `estimated_change_size`、`task_count_estimate`、`file_count_estimate` | 粗略判断执行路径成本，但不能覆盖 risk gate。 |
| Impact surface | `affected_layers`、`affected_contracts`、`dependency_fanout`、`impact_confidence` | 判断是否需要 parser、scout、expanded validation 或 full path。 |
| Risk criticality | `risk_tags`、`reversibility`、`data_sensitivity`、`blast_radius` | 决定 hard gates 和验证深度。 |
| Validation clarity | `validation_available`、`validation_cost`、`oracle_clarity` | 决定是否能 direct/compact，以及是否需要 goal-level verify。 |
| Policy constraints | `policy_hits`、`permission_required`、`hard_gate_hits` | 不参与普通评分，优先决定最低 profile。 |
| Orchestration uncertainty | `requires_agents`、`handoff_count`、`artifact_dependency`、`runtime_recovery_need` | 判断是否需要 full workflow、artifact/delegation、doctor/liveness。 |
| Human oversight need | `human_checkpoint_required`、`approval_reason`、`override_allowed` | 决定是否必须停在 checkpoint。 |

### 4.4 Profile routing

Profile 是平台路径，不是 agent 自由度：

| Profile | 路由条件 | 最低证据要求 | 禁止事项 |
|---|---|---|---|
| direct | intent/acceptance/validation 清晰；impact 小且高置信；无 hard gate；变更可逆。 | minimal validation evidence。 | 不能处理未知影响面、低置信、高风险或不可逆变更。 |
| compact | 需求边界清楚但需要 task boundary、局部验证或少量 scaffold；风险中低；影响面可局部估计。 | mini-spec/task boundary + validation evidence。 | 不能跨过 contract/API/database/security/state-machine 等 hard gate。 |
| full | 多组件、多 task、contract/runtime/schema/artifact/workflow 变更，或验证需要多步骤证据。 | spec/plan/tasks/do/verify/sync-back evidence。 | 不能处理外部未知、架构选型未定或研究问题。 |
| research | 架构设计、外部方案、重大不确定性、策略冲突、无法估计影响面。 | research notes/options/decision/architecture artifact。 | 不能直接进入实现，除非研究给出可执行 handoff。 |

### 4.5 Hard gates

Hard gates 先于 scoring。命中 hard gate 时，profile 只能维持或升级，不能被用户偏好、文件数量或时间压力降级。

| Gate | 最低 profile | 说明 |
|---|---|---|
| 外部未知 / 技术选型 / 架构边界未定 | research | 先产出 research / options / decision。 |
| 安全、权限、认证、数据泄露风险 | full | 必须有明确 spec、review 和 validation。 |
| 数据库、数据迁移、数据丢失、不可逆操作 | full | 必须显式验证和人工 checkpoint。 |
| API / schema / contract 变更 | full | 下游依赖和兼容性需要明确。 |
| 状态机、并发、恢复、liveness | full | 需要事件、状态和失败路径验证。 |
| CI/CD、依赖、构建脚本、发布路径 | full | 影响共享执行环境。 |
| 影响面低置信 | compact 或 research | 能 scout 则 compact+scout；不能估计则 research。 |
| 验收标准不清 | compact 或 research | 先补 acceptance；若问题本身不清则 research。 |
| 人工审批或策略冲突 | checkpoint | 不直接自动推进。 |

### 4.6 Confidence model

Confidence 不等于模型自信，而是决策证据完整度。输出三档：

| Confidence | 条件 | 影响 |
|---|---|---|
| high | intent、impact、risk、validation 都清晰；无 hard gate；验证证据直接可得。 | 允许 direct 或 compact。 |
| medium | 主要信号清楚，但影响面、验证成本或局部依赖仍需确认。 | 最低 compact；需要记录 assumptions。 |
| low | 影响面未知、验收不清、策略冲突、外部方案未定、agent handoff 多且缺少 artifact。 | 禁止 direct；通常升级 full/research 或触发 checkpoint。 |

置信度必须记录原因和缺失信号，不允许只输出分数。

### 4.7 Escalation / downgrade rules

升级规则：

- hard gate 命中后立即升级到最低允许 profile。
- 执行中发现实际影响面大于预估，升级。
- validation 缺失、失败且原因不直接，升级。
- agent 输出缺少 artifact、handoff 不一致或 stale RUNNING，升级到 full/doctor path。
- 用户要求更严格 profile，允许升级。

降级规则：

- 只有在 hard gates 未命中、impact 高置信、validation 明确、风险可逆时才允许降级。
- 降级必须记录 `downgrade_reason` 和被跳过阶段。
- 用户不能通过偏好绕过 hard gate。

### 4.8 Misclassification control

误判控制依赖四类机制：

1. **保守 direct 白名单**：direct 是显式白名单，不是默认路径。
2. **impact confidence**：影响面不能确认时，不因 scope 看起来小而降级。
3. **runtime audit record**：记录输入、命中规则、输出 profile、confidence、skipped stages 和 escalation triggers。
4. **checkpoint / gap report**：发现信息不足时产出 gap，而不是继续伪装成已完成。

### 4.9 Audit record shape

```yaml
lifecycle_decision:
  model_version: phase1.0-final
  input_summary:
    intent_clarity: high | medium | low
    acceptance_clarity: high | medium | low
    estimated_change_size: tiny | small | medium | large
    impact_surface: []
    impact_confidence: high | medium | low
    risk_tags: []
    validation_clarity: clear | partial | unclear
    orchestration_uncertainty: low | medium | high
    policy_hits: []
  decision:
    profile: direct | compact | full | research
    confidence: high | medium | low
    hard_gate_hits: []
    required_stages: []
    skipped_stages: []
    human_checkpoint_required: false
  reasons: []
  escalation_triggers: []
  downgrade_reason: null
  audit:
    decided_at: ISO-8601
    decided_by: command | runtime | user_override
    policy_version: phase1.0-final
    source_artifacts: []
```

## 5. Baseline vs Research Model 对比

| 维度 | Baseline Draft | Research Model | 结论 | 原因 |
|---|---|---|---|---|
| 核心原则 | Sufficient SDD，不强制最大流程。 | 最短安全路径选择器，控制过轻/过重误判。 | keep + refine | 原则一致；Research Model 补充安全路径、证据和误判控制定义。 |
| 输入信号 | intent、acceptance、scope、riskTags、specState、uncertainty、validation。 | 八组信号：intent、scale、impact、risk、validation、policy、orchestration、human oversight。 | merge | Baseline 信号有效但偏任务表面；Research Model 增加 impact confidence、policy、handoff 和 human gate。 |
| 风险门禁 | architecture/external -> research；安全/数据库/API 等 -> full。 | hard gates 独立于 scoring，包含不可逆、低影响置信、策略冲突和审批。 | keep + expand | Baseline hard gates 方向正确；Research Model 明确最低 profile 和不可降级规则。 |
| 复杂度评估 | 使用 score 映射 direct/compact/full/research。 | scoring 可作为 soft signal，但不能覆盖 hard gate、impact confidence 和 policy gate。 | replace scoring priority | 保留评分作为辅助，不作为主算法核心。 |
| Profile routing | direct/compact/full/research 四类路径。 | 四类路径保留，但补充最低证据要求和禁止事项。 | keep + refine | Profile 词汇适合项目，但必须绑定 evidence 和 gate。 |
| Confidence | high/medium/low + score。 | confidence 表示证据完整度，必须记录缺失信号和原因。 | replace | 置信度不应只是评分副产物。 |
| 升级机制 | direct -> compact -> full -> research/architecture。 | hard gate、impact 扩大、validation gap、agent artifact/handoff 问题触发升级。 | merge | Baseline 升级链可用；Research Model 补充运行时触发条件。 |
| 误判控制 | 风险优先、验收不清不能 direct、低置信 scout、记录 reason。 | direct 白名单、impact confidence、audit record、checkpoint/gap report。 | merge | Baseline 控制点有效；Research Model 补充系统化记录与 checkpoint。 |
| 性能成本 | 未明确成本治理。 | workflow 拥有路径，LLM 只在受控决策点；direct/compact 控制小任务成本。 | add | 需要防止 agent context growth 和无界 retry。 |
| 实现复杂度 | 可以直接实现 hard gate + score。 | Phase 1.2 先记录 contract；Phase 1.7 执行 gate；后续再考虑 policy engine。 | refine | 避免 Phase 1 过早引入复杂 policy engine。 |

## 6. Final Lifecycle Decision Model handoff

Phase 1.0 的最终模型、算法和架构 handoff 已抽取为正式下游交付物：`docs/architecture/lifecycle-decision-model.md`。

本研究文档保留 Baseline Draft 封存、外部机制调研、Independent Research Model 和 Baseline 对比；Phase 1.1、Phase 1.2、Phase 1.7 应引用 `docs/architecture/lifecycle-decision-model.md` 作为 canonical 模型/算法输入。

## 8. Research sources

- Risk-based testing taxonomy: https://arxiv.org/abs/1912.11519
- Risk-based testing practical guidance: https://www.testlio.com/blog/risk-based-testing
- Change impact analysis and regression test selection: https://arxiv.org/abs/1606.04568
- Change impact analysis overview: https://en.wikipedia.org/wiki/Change_impact_analysis
- Open Policy Agent documentation: https://www.openpolicyagent.org/docs/
- OPA decision logs: https://www.openpolicyagent.org/docs/management-decision-logs
- Human-in-the-loop agent workflow patterns: https://mindra.co/blog/human-in-the-loop-ai-agent-design-patterns-orchestration
- Workflow engines vs LLM agents: https://tianpan.co/blog/2026-04-20-workflow-engines-beat-llm-agents
- Multi-agent LLM failure modes: https://arxiv.org/abs/2503.13657
- Uncertainty management in LLM-based multi-agent operation: https://arxiv.org/abs/2602.23005
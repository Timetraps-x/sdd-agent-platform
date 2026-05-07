# Lifecycle Decision Model

本文档是 Phase 1.0 的正式模型与算法交付物。它承载最终 lifecycle decision model、profile routing algorithm、audit record schema 和 Phase 1.1 / 1.2 / 1.7 handoff。

调研过程、Baseline Draft 封存、外部机制分析和 Baseline 对比保留在 `docs/research/lifecycle-decision-model-research.md`。

## 1. 定位

Lifecycle decision 是平台入口第一层，用于判断当前需求需要多少 SDD。它不是某个 command 的局部 prompt 逻辑，也不是 agent 可以自由选择的执行偏好。

核心目标：

- 小型、低风险、验收明确的需求走最短安全路径。
- 高风险、影响面不明、架构不确定或验收不清的需求自动升级。
- 每次路由决策都有可解释、可审计、可恢复的记录。
- Hard gates 优先于 soft complexity scoring。

## 2. Profile 定义

| Profile | 含义 | 适用条件 | 禁止事项 |
|---|---|---|---|
| `direct` | intent -> implement -> minimal validation | intent、acceptance、validation 清晰；impact 小且高置信；无 hard gate；变更可逆 | 不处理未知影响面、低置信、高风险、不可逆或需要 agent handoff 的任务 |
| `compact` | intent/mini-spec -> task boundary -> implement -> validation | 边界清楚但需要轻量 task boundary、局部验证或少量 scaffold；风险中低；影响面可局部估计 | 不能绕过 contract/API/database/security/state-machine 等 hard gate |
| `full` | spec -> plan -> tasks -> do -> verify -> sync-back | 多组件、多 task、contract/runtime/schema/artifact/workflow 变更，或验证需要多步骤证据 | 不能处理外部未知、架构选型未定或研究问题 |
| `research` | research -> options -> decision -> architecture artifact -> implementation spec | 架构设计、外部方案、重大不确定性、策略冲突、无法估计影响面 | 不能直接进入实现，除非研究给出可执行 handoff |

## 3. Decision inputs

| Signal group | 字段 | 用途 |
|---|---|---|
| Intent clarity | `intent_clarity`、`acceptance_clarity` | 判断是否需要先补 spec、ask-user 或 research |
| Change scale | `estimated_change_size`、`task_count_estimate`、`file_count_estimate` | 粗略判断执行路径成本，但不能覆盖 risk gate |
| Impact surface | `affected_layers`、`affected_contracts`、`dependency_fanout`、`impact_confidence` | 判断是否需要 scout、expanded validation 或 full path |
| Risk criticality | `risk_tags`、`reversibility`、`data_sensitivity`、`blast_radius` | 决定 hard gates 和验证深度 |
| Validation clarity | `validation_available`、`validation_cost`、`oracle_clarity` | 决定是否能 direct/compact，以及是否需要 goal-level verify |
| Policy constraints | `policy_hits`、`permission_required`、`hard_gate_hits` | 优先决定最低 profile，不参与普通评分 |
| Orchestration uncertainty | `requires_agents`、`handoff_count`、`artifact_dependency`、`runtime_recovery_need` | 判断是否需要 full workflow、artifact/delegation、doctor/liveness |
| Human oversight need | `human_checkpoint_required`、`approval_reason`、`override_allowed` | 决定是否必须停在 checkpoint |

## 4. Hard gates

Hard gates 先于 scoring。命中 hard gate 时，profile 只能维持或升级，不能被用户偏好、文件数量或时间压力降级。

| Gate | 最低 profile | 说明 |
|---|---|---|
| 外部未知 / 技术选型 / 架构边界未定 | `research` | 先产出 research / options / decision |
| 安全、权限、认证、数据泄露风险 | `full` | 必须有明确 spec、review 和 validation |
| 数据库、数据迁移、数据丢失、不可逆操作 | `full` | 必须显式验证和人工 checkpoint |
| API / schema / contract 变更 | `full` | 下游依赖和兼容性需要明确 |
| 状态机、并发、恢复、liveness | `full` | 需要事件、状态和失败路径验证 |
| CI/CD、依赖、构建脚本、发布路径 | `full` | 影响共享执行环境 |
| 影响面低置信 | `compact` 或 `research` | 能 scout 则 compact+scout；不能估计则 research |
| 验收标准不清 | `compact` 或 `research` | 先补 acceptance；若问题本身不清则 research |
| 人工审批或策略冲突 | checkpoint | 不直接自动推进 |

## 5. Final decision order

```text
1. collect_signals
2. evaluate_policy_and_hard_gates
3. estimate_impact_surface_and_confidence
4. choose_minimum_profile
5. apply_soft_complexity_adjustment
6. evaluate_human_checkpoint_need
7. emit_decision_record
8. monitor_escalation_triggers_during_execution
```

## 6. Profile routing algorithm

```text
if external_unknown or architecture_decision_required:
  profile = research
else if security/auth/database/data_loss/api_contract/state_machine/concurrency/ci_dependency gate hits:
  profile = full
else if impact_confidence == low:
  profile = research if impact cannot be scouted else compact
else if validation_clarity == unclear or acceptance_clarity == low:
  profile = compact or research depending on uncertainty
else if all direct whitelist conditions hold:
  profile = direct
else if bounded local change with clear validation:
  profile = compact
else:
  profile = full

confidence = evidence_completeness(intent, impact, risk, validation, orchestration, policy)
human_checkpoint_required = irreversible_action or policy_conflict or low_confidence_high_risk or user_confirmation_needed
```

## 7. Direct whitelist

`direct` 只能在以下条件全部满足时选择：

- intent clarity = high。
- acceptance clarity = high。
- validation clarity = clear。
- impact confidence = high。
- risk tags = empty。
- no policy / hard gate hit。
- change is reversible。
- no agent handoff or long-running workflow required。
- expected validation is cheap and local。

否则至少进入 `compact`。

## 8. Confidence model

Confidence 表示决策证据完整度，不表示 LLM 自信。输出三档：

| Confidence | 条件 | 影响 |
|---|---|---|
| `high` | intent、impact、risk、validation 都清晰；无 hard gate；验证证据直接可得 | 允许 direct 或 compact |
| `medium` | 主要信号清楚，但影响面、验证成本或局部依赖仍需确认 | 最低 compact；需要记录 assumptions |
| `low` | 影响面未知、验收不清、策略冲突、外部方案未定、agent handoff 多且缺少 artifact | 禁止 direct；通常升级 full/research 或触发 checkpoint |

置信度必须记录原因和缺失信号，不允许只输出分数。

## 9. Escalation / downgrade rules

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

## 10. Misclassification controls

误判控制依赖四类机制：

1. **保守 direct 白名单**：direct 是显式白名单，不是默认路径。
2. **impact confidence**：影响面不能确认时，不因 scope 看起来小而降级。
3. **runtime audit record**：记录输入、命中规则、输出 profile、confidence、skipped stages 和 escalation triggers。
4. **checkpoint / gap report**：发现信息不足时产出 gap，而不是继续伪装成已完成。

## 11. Audit record schema draft

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

## 12. Runtime / command ownership

| 内容 | Phase 1.2 runtime record | Phase 1.7 command gate |
|---|---|---|
| input signals | 记录字段和 schema | 收集或提示缺失信号 |
| hard gate hits | 记录 decision result | 执行 gate，不允许静默绕过 |
| profile | 记录最终选择 | 根据 profile 路由命令路径 |
| confidence/reasons | 记录可审计原因 | 用于解释和 ask-user checkpoint |
| required/skipped stages | 记录 | 决定后续 command 是否可执行 |
| escalation triggers | 记录 | 执行中监控并升级 |
| human checkpoint | 记录状态 | 暂停并请求用户确认 |

## 13. Phase handoff

### 13.1 Phase 1.1 必须吸收

- Lifecycle decision 是平台入口第一层，不是某个 command 的局部逻辑。
- Hard gates 优先于 scoring，必须在 architecture baseline 中有明确位置。
- Profile 是受控 workflow path，不是 agent 自由选择。
- Phase 1.1 需要决定 lifecycle decision 与 core/cli/commands/workflows/schemas 的边界。
- Phase 1.1 需要确认哪些 open gaps 会阻塞 Phase 1.2，哪些可延后到 Phase 1.7。

### 13.2 Phase 1.2 record contract 输入

- `lifecycle_decision.model_version`
- `input_summary`
- `decision.profile`
- `decision.confidence`
- `hard_gate_hits`
- `required_stages`
- `skipped_stages`
- `reasons`
- `escalation_triggers`
- `human_checkpoint_required`
- `source_artifacts`

### 13.3 Phase 1.7 command gate 输入

- command 入口必须先收集或推断最小 signals。
- command gate 必须执行 hard gate evaluation。
- command gate 必须输出 profile、confidence、reason 和 checkpoint need。
- command gate 不应复制 runtime 状态机，只调用或遵循 runtime contract。
- command gate 遇到 low confidence / hard gate / missing signal 时必须停在 checkpoint 或升级 profile。

## 14. Open gaps for Phase 1.1

| Gap | 处理建议 |
|---|---|
| signal 如何由 command、runtime、parser 分别提供 | Phase 1.1 定 architecture boundary；Phase 1.2 先记录 schema |
| soft complexity 是否需要数值 score | Phase 1.1 决定是否保留为解释字段；不要让 score 覆盖 hard gate |
| policy engine 是否需要外部 OPA 类实现 | Phase 1 暂不引入；Phase 1.1 只定义 policy decision contract |
| direct path 是否创建 run record | Phase 1.1 决定：建议 direct 可不创建完整 run，但高风险入口必须记录 decision |
| human checkpoint 的 UX 位置 | Phase 1.1 定 command/CLI 边界；Phase 1.7 落地行为 |

# Phase 1.0 Lifecycle Decision Model 调研、对比与定稿 Tasks

## Phase Artifact

本文件是 `specs/master/phases/phase-1.0-lifecycle-research.md` 的执行 tasks。

Phase 1.0 是当前执行阶段，完成并验证后才能进入 `specs/master/phases/phase-1.1-architecture-baseline.md`。

## Task List

### P1.0-T1: 封存 Baseline Draft

```sdd-task
id: P1.0-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - docs/research/lifecycle-decision-model-research.md
validation:
  - manual-doc-review
risk:
  - Baseline Draft 被误用为调研提纲
```

#### Boundary

只确认 Baseline Draft 的来源、状态和禁止事项，不改写为 Research Model。

#### Acceptance

- Baseline Draft 明确标记为未调研验证。
- 文档明确禁止把 Baseline Draft 当作检索提纲、评分模板或结论模板。

---

### P1.0-T2: 独立调研外部机制

```sdd-task
id: P1.0-T2
status: completed
wave: 1
depends_on:
  - P1.0-T1
affected_files:
  - docs/research/lifecycle-decision-model-research.md
validation:
  - manual-doc-review
risk:
  - 调研范围过宽
  - 只摘录资料不转译机制
```

#### Boundary

只调研 lifecycle decision 相关机制，不扩展到完整 workflow runtime 或平台实现。

#### Acceptance

- 覆盖 risk-based testing / risk-based change management。
- 覆盖 change impact analysis。
- 覆盖 policy / rule engine。
- 覆盖 adaptive workflow / workflow routing。
- 覆盖 human-in-the-loop automation。
- 覆盖 LLM agent orchestration failure patterns。

---

### P1.0-T3: 产出 Independent Research Model

```sdd-task
id: P1.0-T3
status: completed
wave: 2
depends_on:
  - P1.0-T2
affected_files:
  - docs/research/lifecycle-decision-model-research.md
validation:
  - manual-doc-review
risk:
  - Research Model 被 Baseline Draft 污染
```

#### Boundary

Independent Research Model 必须先独立成型，不在本 task 中做 Baseline 对比。

#### Acceptance

- Research Model 包含 input signals。
- Research Model 包含 profile routing。
- Research Model 包含 hard gates。
- Research Model 包含 confidence model。
- Research Model 包含 escalation / downgrade rules。
- Research Model 包含 misclassification control。
- Research Model 包含 audit record shape。

---

### P1.0-T4: 对比 Baseline Draft

```sdd-task
id: P1.0-T4
status: completed
wave: 3
depends_on:
  - P1.0-T3
affected_files:
  - docs/research/lifecycle-decision-model-research.md
validation:
  - manual-doc-review
risk:
  - 对比过程反向污染 Independent Research Model
  - 未说明取舍原因
```

#### Boundary

只在 Independent Research Model 完成后对比 Baseline Draft，不回写污染独立调研结论。

#### Acceptance

- 对比 input signals、profile routing、hard gates、confidence、escalation / downgrade、audit record。
- 每项都有 keep / replace / merge / drop 结论。
- 每项结论都有原因或 open gap。

---

### P1.0-T5: 形成 Final Model 与 routing algorithm

```sdd-task
id: P1.0-T5
status: completed
wave: 4
depends_on:
  - P1.0-T4
affected_files:
  - docs/research/lifecycle-decision-model-research.md
validation:
  - manual-doc-review
risk:
  - Final Model 边界过宽
  - routing algorithm 不可执行或不可解释
```

#### Boundary

只定 lifecycle decision 的最终模型和算法，不实现 runtime 或 command gate。

#### Acceptance

- Final Model 明确 decision inputs、derived signals、hard gate evaluation order。
- routing algorithm 明确 direct / compact / full / research 的选择规则。
- confidence、human checkpoint、escalation / downgrade、misclassification control 明确。
- audit record schema draft 明确。

---

### P1.0-T6: 形成 architecture handoff

```sdd-task
id: P1.0-T6
status: completed
wave: 4
depends_on:
  - P1.0-T5
affected_files:
  - docs/research/lifecycle-decision-model-research.md
validation:
  - manual-doc-review
risk:
  - Phase 1.1 无法吸收 Phase 1.0 输出
```

#### Boundary

只交付 lifecycle decision architecture handoff，不替代 Phase 1.1 的全平台架构基线。

#### Acceptance

- 明确 Phase 1.1 必须吸收的模型、算法和架构边界。
- 明确 Phase 1.2 runtime record contract 输入。
- 明确 Phase 1.7 command decision gate 输入。
- 明确仍需 Phase 1.1 补齐的架构调研或 open gaps。

---

### P1.0-T7: 生成 Phase 1.0 validation checkpoint

```sdd-task
id: P1.0-T7
status: completed
wave: 5
depends_on:
  - P1.0-T5
  - P1.0-T6
affected_files:
  - specs/master/phase1.0-validation.md
  - specs/master/phases/PHASE_STATUS.md
  - docs/research/lifecycle-decision-model-research.md
validation:
  - manual-doc-review
risk:
  - 未验证完成就推进 Phase 1.1
```

#### Boundary

只总结 Phase 1.0 完成证据和是否满足进入 Phase 1.1 的条件，不执行 Phase 1.1 全平台架构冻结。

#### Acceptance

- validation 文档明确完成项、验证结果、open gaps、下一阶段建议。
- phase 状态清单中 Phase 1.0 可从 `in_progress` 更新为 `completed` 或 `blocked`。
- 明确是否可以进入 Phase 1.1 架构基线。

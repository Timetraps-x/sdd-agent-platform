# Phase 5.6 Spec

## Metadata

- phase_id: `5.6`
- title: `Phase 7 Graph Handoff Hardening`
- status: `completed`
- depends_on: `5.5`
- blocks: `7.0`
- source_artifact: `specs/master/phases/phase-5.6-phase7-graph-handoff-hardening.md`

## Problem / Intent

Phase 7 需要消费 Phase 5 的 harness metadata，但如果 handoff 不稳定，未来图谱会从自由文本反推结构。Phase 5.6 只稳定图谱输入，不提前实现图谱；新的 Phase 6 会在图谱前补充 agent / skill runtime metadata。

## Requirements

- FR-1: 必须定义 Phase 7 可消费的 harness metadata schema。
- FR-2: 必须更新 Phase 7 artifact，使其依赖 Phase 5.6 handoff。
- FR-3: 必须明确 graph-ready metadata 与 `.sdd/runs`、specs、Project Context Pack 的事实源关系。
- FR-4: 必须禁止在 Phase 5.6 实现 graph database、embedding、AST/LSP graph。

## Out of Scope

- code graph implementation。
- graph database / embedding provider choice。
- graph query dashboard。

## Acceptance Criteria

- AC-1: Phase 7 输入 metadata 列表完整。
- AC-2: Phase 7 artifact/spec 可基于 metadata 拆分后续 executable phases。
- AC-3: Phase 5.6 没有图谱 runtime scope creep。
- AC-4: `sdd status --branch master` 无 route gaps。
# Phase 5.5 Plan

## Metadata

- phase_id: `5.5`
- plan_id: `phase5.5-eval-learning-context-pack-harness-plan`
- depends_on: `5.4`
- blocks: `5.6`

## Implementation Slices

### P1: SkillAgentEvalContract

- Stabilize ERP trial corpus.
- Define scoring dimensions and thresholds.
- Add regression baseline for `/sdd:*` and agent evidence quality.

### P2: HarnessLearningContract

- Define allowed learning sinks.
- Convert repeated failure into context/checklist/risk vocabulary/doctor/eval changes.
- Prohibit self-modifying runtime.

### P3: Project Context Pack

- Define AGENTS.md-style durable context structure.
- Clarify source-of-truth boundaries.
- Link architecture/product/reference documents.

## Validation Strategy

- `sdd status --branch master`
- eval baseline review
- context pack boundary review

## Risks

- Learning must not silently rewrite runtime behavior.
- Context pack must not duplicate structured facts from `.sdd/project.yml`, specs, or runs.

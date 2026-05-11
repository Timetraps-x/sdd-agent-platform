# Phase 5.1 Plan

## Metadata

- phase_id: `5.1`
- plan_id: `phase5.1-context-risk-output-harness-plan`
- depends_on: `5.0`
- blocks: `5.2`

## Implementation Slices

### P1: ContextResolverContract

- Add a shared context resolver in core.
- Apply resolver to status, tasks, lifecycle, generated instructions where relevant.
- Output `branch_source` with branch decisions.

### P2: LifecycleRiskGateContract

- Add `sdd lifecycle decide --from-file <path>`.
- Add `sdd lifecycle decide --from-text <text>`.
- Extract deterministic risk signals.
- Prevent hard gate fallback to compact.

### P3: OutputQualityContract

- Normalize output sections: changed / decision / evidence / gaps / next.
- Reduce onboarding/status/instruction repetition.
- Prefer delta and platform judgment over source document rewrite.

## Validation Strategy

- `npm test`
- `npm run build`
- `sdd lifecycle decide --from-text "三线程状态流转，并发更新，SQL 拼接，数据一致性风险"`
- `sdd status --branch master`

## Risks

- Branch fallback must not hide user intent.
- Risk detection must be deterministic enough to test.
- Output slimming must not remove evidence needed for debugging.

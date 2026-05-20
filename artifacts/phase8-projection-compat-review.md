# Phase 8 Projection Compatibility Review

## Scope

PHASE8-2 adds observable-only projection envelope helpers and legacy compatibility adapters. It does not add Runtime Store tables, change command behavior, or make Phase 8 projections required by status, doctor, sync-back, ship, or `/sdd:test`.

## Projection helper review

- `recordRuntimeProjection` remains available for existing Phase 7 projections.
- Phase 8 envelope helpers layer on the existing `projections` table using deterministic `projection_type + scope_key` rows.
- Envelope identity is deterministic from `projectionType`, `scopeKey`, `inputHash`, and `producerVersion`.
- Freshness is explicit: missing data is `unknown`, input hash drift is `stale`, and producer version/contract drift is `incompatible`.
- Idempotent writes preserve the existing envelope when input hash, producer version, and payload are unchanged.

## Legacy adapter review

- `TaskRiskProfile` is preserved as the legacy model and now maps into `CodingRiskSignal[]` for comparison.
- The adapter separates source, runtime-state, evidence, security, external, context, and performance dimensions.
- Legacy context/token flags are mapped into the Phase 8 context dimension rather than kept as primary budget policy.
- `LifecycleDecisionRecord` maps into `LifecycleRiskDecision` for comparison only.
- The mapped lifecycle decision contains lifecycle policy fields only and no agent, team, subagent, or owner selection fields.

## Boundary confirmation

- No runtime gates consume the new adapters yet.
- No schema migration was added.
- No root `@sdd-agent-platform/core` barrel was restored.
- Code graph remains deferred to Phase 9 and is not required by these helpers.

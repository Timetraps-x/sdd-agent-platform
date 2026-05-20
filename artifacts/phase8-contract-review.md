# Phase 8 Contract Review

## Scope

PHASE8-1 added type-only and pure contract modules for the Phase 8 runtime foundation. No command behavior, status/doctor gates, sync-back, ship, or `/sdd:test` behavior was changed.

## Boundaries reviewed

- Lifecycle risk decision contains lifecycle policy fields only and no agent/team/subagent selection fields.
- Stage runtime owns active stage and workflow handoff contracts; subagents cannot own lifecycle stages through these contracts.
- Work units distinguish main-agent, co-main-agent, and subagent authority.
- Subagent contracts default to non-authoritative result handling and explicitly disallow production edit and lifecycle ownership authority.
- Context offload is modeled as load signal, offload decision, and scoped context handoff rather than token budget as primary policy.
- Unified test evidence separates command status, evidence coverage, and policy judgment under one `/sdd:test` result contract.
- Model-produced artifacts are explicitly stage-owned, candidate, or non-authoritative and cannot be used directly as final risk, stage completion, or ship-gate authority.
- Code graph implementation was removed from Phase 8 and deferred to Phase 9; Phase 8 only keeps absent-safe handoff references.

## Public exports

Added domain-level core subpaths:

- `@sdd-agent-platform/core/coding-facts`
- `@sdd-agent-platform/core/risk`
- `@sdd-agent-platform/core/stage-runtime`
- `@sdd-agent-platform/core/work-units`
- `@sdd-agent-platform/core/subagents`
- `@sdd-agent-platform/core/context-offload`
- `@sdd-agent-platform/core/evidence-runtime`

Root `@sdd-agent-platform/core` barrel import was not restored.

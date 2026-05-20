# Phase 8 Work Unit, Subagent, and Context Offload Review

## Scope

PHASE8-8 through PHASE8-10 add projection-only runtime models for bounded work units, non-authoritative subagents, and context load/offload decisions. The integration remains observe/compare: it exposes state through statusline and doctor without spawning external agents or making subagent output authoritative for lifecycle gates.

## Work unit runtime

`packages/core/src/work-units/runtime.ts` introduces:

- `phase8_work_unit` runtime projections.
- Legal transitions for `pending`, `running`, `blocked`, `completed`, `failed`, and `cancelled` work units.
- Validation that only main-agent work units can own a stage.
- Validation that subagent work units are always `non-authoritative`.
- Gate semantics where only blocking, incomplete work units block their declared gate.

## Subagent runtime

`packages/core/src/subagents/runtime.ts` introduces:

- `phase8_subagent_definition`, `phase8_subagent_dispatch`, and `phase8_subagent_result` projections.
- Policy checks rejecting production edit authority and lifecycle ownership.
- Write-path checks for bounded test/spec paths and explicit allowed prefixes.
- Foreground/background dispatch records without requiring actual external execution.
- Blocking dispatch diagnostics for incomplete, failed, stale, or incompatible dispatches.
- Result consumption that returns summary/artifact/evidence refs with `authoritative: false`.

## Context offload runtime

`packages/core/src/context-offload/runtime.ts` introduces:

- `phase8_context_load_signal` and `phase8_context_offload_decision` projections.
- Load scoring across file count, artifact size, dependency fanout, unknown impact, stale evidence, and log volume.
- Levels: `normal`, `elevated`, `high`, `overloaded`.
- Actions: `inline`, `summarize`, `dispatch-subagent`, `block-for-curation`.
- Dispatch and curation remain handoff/stage-output gates, not direct lifecycle PASS decisions.

## Statusline and doctor integration

`ProjectStatus` now includes:

- `contextRuntime`
- `subagentDispatches`

`StatuslineProjection` now surfaces:

- `contextLoad`
- `contextAction`
- `subagentHealth`
- subagent dispatch/blocking counts

CLI status renders visible lines for `context_offload` and `subagent_dispatch`. Doctor renders visible observe/compare diagnostics:

- `context_offload_state`
- `subagent_dispatch_state`

## Authority boundary

The implementation keeps the intended Phase 8 boundary:

- Subagents cannot own lifecycle stages.
- Subagents cannot edit production by policy.
- Subagent results are non-authoritative and can only contribute summary, diagnostic, test suggestion, or evidence-candidate refs.
- Context pressure drives summarization/offload/curation decisions, not automatic PASS/FAIL decisions.
- Existing workflow next-command behavior remains legacy-compatible during observe/compare.

# Phase 9 Spec — Code Graph Signals

## Goal

Introduce code graph signals after Phase 8 coding runtime convergence stabilizes. Phase 9 should provide changed refs, impacted modules, impacted tests, public API refs, dependency fanout, confidence, and reasons as optional signals consumed by lifecycle risk, context offload, and unified test evidence.

## Phase 8 handoff

Phase 8 intentionally does not implement code graph providers, graph caches, graph projections, or graph-consuming gates. Phase 8 only keeps absent-safe extension points so missing graph data cannot block status, doctor, ship, sync-back, or `/sdd:test`.

## Initial scope

- Define a code graph signal contract with changed refs, impacted modules/tests, public API refs, dependency fanout, confidence, and reasons.
- Start with predictable TypeScript/Node heuristics before broad language abstraction.
- Add graph cache invalidation based on source hashes, tsconfig/package metadata, lockfile hash, and changed refs.
- Feed graph signals into risk, context offload, and test-impact decisions without directly assigning agents or owning lifecycle gates.

## Inputs

- Git changed refs and staged/unstaged file lists.
- SDD task `affected_files`, validation commands, and acceptance refs.
- TypeScript project metadata such as `tsconfig`, package exports, package scripts, and lockfile hashes.
- Existing Phase 8 runtime projections for lifecycle risk, context offload, stage handoff, subagent dispatch, and unified test evidence.

## Outputs

- Optional graph signal projections with impacted modules, impacted tests, public API refs, dependency fanout, confidence, and reasons.
- Cache metadata keyed by source hashes, config hashes, and changed refs.
- Test-impact hints for `/sdd:test` and context-impact hints for context offload.
- Risk input signals for lifecycle risk decisions, without assigning agents or taking lifecycle ownership.

## Consumers

- Lifecycle risk can consume graph signals as one evidence source for direct/compact/full/research depth.
- Context offload can use impacted modules and fanout to decide inline, summarize, dispatch-subagent, or block-for-curation.
- Unified test evidence can use impacted tests as suggestions for validation command selection and acceptance coverage review.
- Status and doctor can report graph freshness and confidence once Phase 9 projections exist.

## Compatibility boundary

- Missing graph signals must be treated as absent optional evidence.
- Low-confidence graph signals may increase review or context curation, but cannot be the sole ship/sync-back blocker.
- Graph analysis must not select agents, dispatch subagents, or mark lifecycle gates complete.
- Phase 8 projections remain valid without graph fields.

## Out of scope

- Do not move lifecycle authority into graph analysis.
- Do not make low-confidence graph data a sole ship or sync-back gate.
- Do not build a broad multi-language symbol server before the TypeScript/Node baseline proves useful.

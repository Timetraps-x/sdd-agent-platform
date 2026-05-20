# Phase 7.7 Research — Command-scoped Team Runtime

## Research scope

Phase 7.7 focuses on translating team-mode from task-level execution support into command-scoped runtime policy. The research question is not whether to introduce a general multi-agent framework, but how to make existing SDD commands route bounded roles, context packs, evidence authority, and independence rules without inflating main context or letting subagents own workflow transitions.

## Local findings

- Phase 7.6 already provides a deterministic agent capability catalog with domains, routed material packs, command mappings, and authority levels.
- Phase 6 router/team-mode already records cost-bounded routing decisions, but its scope is task execution rather than command-specific role contracts.
- Phase 7.4 and Phase 7.5 separated verification design, executed test evidence, and semantic verify promotion; Phase 7.7 must preserve that separation.
- Existing doctor and registry CLI surfaces are the right visibility layer for command-team runtime health.

## External mechanism translation

- Claude Code subagents validate the context-isolation and summary-return pattern: role work should return compact summaries and evidence references, not full shared chat state.
- Claude Code context/cost guidance reinforces routing material packs only when triggered and recording estimated context/summary/evidence telemetry.
- Oh My OpenAgent/OpenCode team mode is useful as a command-level collaboration concept, but should be translated into SDD contracts rather than copied as a prompt OS.
- AutoGen/CrewAI/LangGraph-style orchestration shows useful role and handoff patterns, but their runtime dependencies are intentionally out of scope for this platform core.

## Decision

Implement a deterministic command team runtime registry with:

- command profiles for `spec`, `plan`, `tasks`, `verifies`, `do`, `test`, `verify`, `sync-back`, `ship`, `doctor-deep`, and `recover`;
- role profiles mapped to Phase 7.6 capability domains and material packs;
- explicit `single`, `team-lite`, `team-required`, and `blocked` modes;
- summary-only, artifact-backed role output policy;
- independence rules for roles that must remain distinguishable;
- estimated-only telemetry for context bytes, summary bytes, and evidence refs.

## Boundary decisions

- Subagents and role outputs remain advisory or evidence-bearing inputs; existing command runners keep workflow-affecting decisions.
- Material packs are selected by role and command policy, never globally injected.
- `validation_runner` authority stays limited to evidence collection and does not replace semantic verification.
- CLI and doctor expose inspection/validation/decision visibility without executing an external agent framework.

## Handoff to implementation

The implementation should add `packages/core/src/registries/command-team-runtime.ts`, export it through `@sdd-agent-platform/core/registries`, expose `sdd command-team inspect|validate|decide`, add doctor visibility, and cover role routing, independence rules, and telemetry in focused tests.

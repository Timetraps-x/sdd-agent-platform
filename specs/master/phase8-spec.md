# Phase 8 Spec — Coding Runtime Convergence

## Goal

Converge the Phase 7 SDD runtime into a unified coding runtime: lifecycle depth is driven by coding risk decisions, workflow progress is governed by explicit stage handoff, subagents perform bounded non-authoritative side work with isolated context, context/token optimization becomes context offload, and `/sdd:test` completes both command execution and acceptance evidence judgment. The goal is controllable workflow progression with automation inside each approved stage.

Phase 8 is a full architecture convergence phase, not a Phase 8.0 sub-slice. Its purpose is to make the platform better for real coding work: safer lifecycle depth, clearer control ownership, higher-quality evidence, less main-context overload, and more efficient parallel/background analysis.

## In scope

- Introduce a coding fact and lifecycle risk decision layer that is independent from agent/team/subagent modeling.
- Convert or adapt the current `TaskRiskProfile` into risk signals consumed by a new coding risk profile and lifecycle risk decision.
- Define lifecycle risk decisions in terms of required stages, skipped stages, blocked stages, required evidence, review requirements, approval policy, and human checkpoint requirements.
- Make status, doctor, sync-back, ship, stage handoff, and test evidence consume lifecycle risk decisions instead of independently reinterpreting risk.
- Introduce stage runtime contracts for active stage ownership and workflow handoff between specialist stage agents.
- Distinguish workflow stage handoff from Claude-style subagent dispatch.
- Introduce work unit contracts for main-agent, co-main-agent, and subagent work.
- Introduce Claude-style subagent definition, dispatch, and result contracts with isolated context and artifact-backed summary return.
- Enforce the project subagent boundary: subagents do not edit production code, do not own lifecycle control, do not require independent worktrees, may write test code when explicitly allowed, and return non-authoritative results by default.
- Reframe context/token optimization as context load, delegation pressure, scoped context handoff, and context offload.
- Keep byte/token accounting only as guardrail, diagnostics, or per-context safety, not as the primary optimization model.
- Unify `/sdd:test` so it executes validation commands, collects evidence, evaluates acceptance coverage, and prepares sync-back readiness in one user-facing lifecycle stage.
- Keep low-level `sdd verify task` only as compatibility or diagnostic capability, not as a primary `/sdd:` lifecycle stage.
- Prepare a Phase 9 handoff for code graph signals without implementing code graph in Phase 8.
- Persist new runtime decisions initially through artifacts/projections, with a path to stable Runtime Store schema once contracts settle.

## Out of scope

- Do not continue expanding `CommandTeamRuntime` as the primary execution runtime.
- Do not make subagents production-code modifiers.
- Do not give subagents lifecycle stage ownership or final gate authority.
- Do not make independent worktrees the default subagent model.
- Do not implement a broad agent marketplace in this phase.
- Do not implement code graph signal providers in this phase; code graph is deferred to Phase 9 after Phase 8 consumers stabilize.
- Do not keep `TokenHealth` or `ContextBudget` as the primary architecture vocabulary for context optimization.
- Do not keep standalone `/sdd:verify` as a primary slash lifecycle command.
- Do not replace contract/state/evidence with prompt-only orchestration.
- Do not publish, push, tag, deploy, or mutate remote/shared release state.

## Acceptance criteria

- AC-1: A new coding fact and lifecycle risk decision contract exists; the lifecycle risk decision contains no agent, team, or subagent selection fields.
- AC-2: The risk decision outputs lifecycle profile, required stages, skipped stages, blocked stages, required evidence, required reviews, approval policy, human checkpoint requirement, and reasons.
- AC-3: Existing task risk data is adapted into coding risk signals; `TaskRiskProfile` is no longer the primary model consumed by new runtime gates.
- AC-4: Status, doctor, sync-back, and ship can read lifecycle risk decisions and report missing, stale, blocked, or incompatible decisions.
- AC-5: Ship and sync-back readiness use lifecycle risk decision plus evidence evaluation rather than independently deriving readiness from scattered risk/token signals.
- AC-6: Stage runtime can record active stage, owner agent, co-main agents, input refs, output refs, decision refs, status, and blocking reasons.
- AC-7: Workflow handoff can be proposed, accepted, rejected, or blocked, and validation considers required refs, lifecycle risk decision, evidence refs, open questions, and blocking gaps.
- AC-8: Workflow state output includes active stage and latest handoff state; next-command recommendation is derived from lifecycle risk decision and handoff state rather than only heuristic task status.
- AC-9: Work unit runtime distinguishes main-agent, co-main-agent, and subagent work units, including authority, blocking behavior, required-before gate, context ref, output refs, evidence refs, and status.
- AC-10: Subagent definition, dispatch, and result contracts exist; subagent results are non-authoritative by default and return summary/artifact/evidence refs.
- AC-11: Subagent policy prevents production code edits, prevents lifecycle ownership, and restricts test-writer style subagents to test paths.
- AC-12: Foreground and background subagent dispatches can be recorded; blocking subagent work can block a declared gate, while non-blocking work does not stop the main stage unless configured.
- AC-13: Context load and context offload contracts exist, including context load signal, delegation/offload decision, and scoped context handoff.
- AC-14: High context load scenarios recommend or require summarize/offload/subagent dispatch instead of simply trimming optional context.
- AC-15: Statusline and doctor surface context load/delegation pressure rather than treating token health as the primary readiness concept.
- AC-16: `/sdd:test` executes commands, records command outputs, maps evidence to acceptance refs, evaluates AC coverage, and returns a unified test evidence result.
- AC-17: `/sdd:test` PASS no longer recommends `sdd verify task`; it recommends sync-back inspection or apply according to policy.
- AC-18: Low-level verify remains available only as compatibility/diagnostic behavior and is not exposed as a primary slash lifecycle stage.
- AC-19: Code graph scope is explicitly deferred to Phase 9; Phase 8 keeps only optional signal extension points where needed.
- AC-20: No Phase 8 command, status, doctor, ship, sync-back, or `/sdd:test` gate depends on code graph signals.
- AC-21: Focused tests cover lifecycle risk direct/compact/full/research/blocked outcomes, stage handoff accepted/rejected/blocked outcomes, subagent non-authoritative result handling, context offload decisions, and unified test evidence evaluation.
- AC-22: Build, typecheck, full tests, package dry-run, status, tasks list, doctor, and representative `/sdd:test` smoke pass.

## Public contracts

### Coding fact set

The coding fact set is the raw fact layer. It collects SDD document state, task state, changed-file facts, runtime facts, evidence facts, test facts, and external/unknown facts. It does not decide risk, lifecycle depth, agent selection, or approval.

### Coding risk profile

The coding risk profile is derived from coding facts and risk signals. It describes risk level, dimensions, signals, confidence, and reasons. It must not select agents or subagents.

### Lifecycle risk decision

The lifecycle risk decision is the policy output consumed by workflow gates. It determines required stages, skipped stages, blocked stages, required evidence, review requirements, approval policy, human checkpoint requirement, and reasons.

### Stage runtime

The stage runtime records active stage ownership and stage status. A stage may have one owner agent and multiple co-main agents. Subagents cannot own a lifecycle stage.

### Workflow handoff

Workflow handoff is the transition contract between lifecycle stages. It records from/to stage, from/to agent, output refs, required input refs, lifecycle risk decision ref, evidence refs, open questions, gaps, and handoff status.

### Work unit runtime

A work unit is an execution unit within a stage. It can represent a main agent, co-main agent, or subagent. Work units carry authority, blocking behavior, required-before gate, context ref, output refs, evidence refs, and status.

### Subagent definition and result

Subagents are Claude-style bounded workers with isolated context, own prompt/tool boundary, and artifact-backed output. They do not edit production code, do not own lifecycle control, and return non-authoritative results unless a future explicit evidence policy says otherwise.

### Context load and offload

Context load is a runtime signal describing whether raw context should stay inline, be summarized, be delegated to subagents, or block for curation. Byte/token estimates may support this decision but do not define the primary model.

### Unified test evidence

The unified test evidence runtime combines validation command execution, evidence capture, acceptance coverage evaluation, policy-backed evidence judgment, and sync-back readiness into `/sdd:test`.

### Phase 9 code graph handoff

Code graph signals are deferred to Phase 9. Phase 8 may define optional extension points for future graph signals, but missing graph signals must not block or degrade Phase 8 lifecycle gates.

## Expected behavior

- A docs-only low-risk update can remain direct or compact without activating a large workflow.
- A security-sensitive or public API change requires deeper lifecycle, stronger evidence, and likely human checkpoint regardless of agent availability.
- A high context load task should trigger summarization or subagent offload rather than forcing the main agent to ingest all raw files/logs/artifacts.
- A background subagent may finish after the main agent continues; its result is recorded and can be consumed by later gates only if a required-before rule says so.
- A test-writer subagent may write test code but cannot change production source paths.
- `/sdd:test` PASS means both command execution and evidence judgment passed for the relevant acceptance refs.
- `/sdd:test` FAIL or BLOCKED reports evidence gaps rather than asking the user to run a separate primary verify lifecycle command.
- Ship readiness is blocked by missing required lifecycle decision, missing required evidence, stale evidence, failed validation, unresolved handoff, or unresolved blocking gaps.
- Token estimates remain visible as diagnostics but are not the top-level ship/readiness concept.

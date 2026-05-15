# Phase 5.0 Tasks

## Metadata

- phase_id: `5.0`
- plan_id: `phase5.0-harness-reframe-contract-freeze-plan`
- lifecycle_profile: `full`

## Task List

### P5.0-T1: Reframe Phase 5 as SDD Harness Engineering

```sdd-task
id: P5.0-T1
status: completed
wave: 1
depends_on: []
affected_files:
  - specs/master/phases/phase-5.0-source-architecture-localization.md
  - specs/master/phase5.0-spec.md
  - specs/master/phase5.0-plan.md
  - specs/master/phase5.0-tasks.md
  - specs/master/phase5.0-validation.md
  - specs/master/phases/README.md
  - specs/master/phases/PHASE_STATUS.md
  - README.md
validation:
  - sdd tasks gaps --branch master
  - sdd status --branch master
risk:
  - roadmap
  - documentation-consistency
  - phase-status
```

#### Boundary

把 Phase 5 从 `Source Architecture Localization` 重构为 `SDD Harness Engineering`，并明确旧定位只保留为 superseded/historical input。不得改动运行时代码。

#### Acceptance

- Phase 5 当前标题为 SDD Harness Engineering。
- `Source Architecture Localization` 不再作为当前阶段定位。
- Phase 5 明确依托 Claude Code 等 AI tool harness，不建设 OS/scheduler/plugin runtime/OpenCode clone。
- Phase 6.0 Agent / Skill Runtime Harness 是 runtime owner；Phase 7.0 Core Runtime Modularization 是 core boundary owner；Phase 8.0 Code Knowledge Graph Baseline 是代码知识图谱 owner。
- Phase status 不再声称 Phase 5 runtime implementation 已 completed。

### P5.0-T2: Split oversized Phase 5 runtime work into 5.1-5.6

```sdd-task
id: P5.0-T2
status: completed
wave: 1
depends_on:
  - P5.0-T1
affected_files:
  - specs/master/phases/README.md
  - specs/master/phases/PHASE_STATUS.md
  - specs/master/validation.md
  - specs/master/phase5.1-spec.md
  - specs/master/phase5.2-spec.md
  - specs/master/phase5.3-spec.md
  - specs/master/phase5.4-spec.md
  - specs/master/phase5.5-spec.md
  - specs/master/phase5.6-spec.md
validation:
  - sdd tasks gaps --branch master
  - sdd status --branch master
risk:
  - roadmap
  - phase-boundary
  - implementation-scope
```

#### Boundary

将原 `P5.0-T2`~`P5.0-T5` 的 runtime / eval / graph handoff 工作迁移到独立 Phase 5.1~5.6。Phase 5.0 只保留 reframe 和 contract freeze。

#### Acceptance

- Phase 5.1 owns context/risk/output harness。
- Phase 5.2 owns workflow/agent registry harness。
- Phase 5.3 owns task graph/run evidence harness。
- Phase 5.4 owns managed assets/query status harness。
- Phase 5.5 owns eval/learning/context pack harness。
- Phase 5.6 owns graph handoff hardening for the later Phase 8 code graph.

## Dependency Notes

- Phase 5.0 is complete when route, guardrails, contract names, and phase split are consistent.
- Runtime implementation begins in Phase 5.1, not Phase 5.0.

## Phase Gate Checkpoint

- ready_for_next_phase: `true`
- next_phase: `5.1`
- blockers: []

# Phase 7.7 Spec — Command-scoped Team Runtime

## Goal

Add a command-scoped team runtime contract that maps SDD commands to bounded role profiles, capability requirements, material pack routing, independence rules, and context/evidence telemetry.

## In scope

- Define command team runtime contract version.
- Define command runtime commands: `spec`, `plan`, `tasks`, `verifies`, `do`, `test`, `verify`, `sync-back`, `ship`, `doctor-deep`, `recover`.
- Define role profiles for norm discovery, uncertainty review, performance planning, verification design, evidence running, implementation review, sync-back risk review, release summary, and context curation.
- Define command profiles with default mode, escalation risk tags, required/optional roles, material policy, evidence authority, and telemetry policy.
- Define independence rules for role pairs that must not collapse into a single authority.
- Expose inspection, validation, and deterministic decision APIs.
- Add doctor and CLI visibility.

## Out of scope

- Do not introduce a general agent OS or external orchestration framework.
- Do not let subagents directly change workflow state.
- Do not change `/sdd:test`, `/sdd:verify`, or `/sdd:sync-back` semantics.
- Do not inline full material libraries into active command context.
- Do not restore root `@sdd-agent-platform/core` imports.

## Acceptance criteria

- AC-1: Runtime inspection exposes 11 command profiles, 9 role profiles, and independence rules.
- AC-2: Runtime validation detects unknown roles, unknown capability domains, unknown material packs, missing command profiles, and forbidden inline material policy.
- AC-3: Runtime decision supports `auto`, `force`, and `off` activation and escalates risk-tagged commands into bounded team mode.
- AC-4: Verification/test role independence keeps verification design and executed evidence distinguishable.
- AC-5: Doctor reports command team runtime visibility.
- AC-6: CLI exposes `sdd command-team inspect|validate|decide` with text and JSON output.
- AC-7: Build, typecheck, full tests, pack dry-run, CLI smokes, and latest doctor pass.

## Public contracts

- Contract version: `phase-7.7-command-team-runtime-v1`.
- Core APIs:
  - `inspectCommandTeamRuntime(projectRoot)`
  - `validateCommandTeamRuntime(projectRoot)`
  - `decideCommandTeamRuntime(projectRoot, options)`
- CLI:
  - `sdd command-team inspect [--json]`
  - `sdd command-team validate [--json]`
  - `sdd command-team decide --command <command> [--risk <tag>] [--team-mode auto|force|off] [--json]`

## Expected behavior

- Default command profile mode is selected unless risk tags or forced activation require escalation.
- `activation=off` chooses single mode and removes role independence requirements that require multiple active roles.
- Selected material packs are derived from active roles and sorted deterministically.
- Blocked decisions return no roles, no material packs, no telemetry, and a diagnostic reason.

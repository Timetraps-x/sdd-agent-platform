# Phase 7.6 Tasks — Agent Capability Upgrade

## Task list

| Task | Status | Acceptance refs | Notes |
|---|---|---|---|
| PHASE7.6-1 | completed | AC-1, AC-2 | Add typed Phase 7.6 agent capability catalog, material packs, command mappings, and validation rules. |
| PHASE7.6-2 | completed | AC-1, AC-2 | Export catalog through `@sdd-agent-platform/core/registries` and cover catalog validation with registry tests. |
| PHASE7.6-3 | completed | AC-3 | Add doctor check for Phase 7.6 catalog visibility and validation failure reporting. |
| PHASE7.6-4 | completed | AC-4 | Add `sdd agent-capabilities list|validate`, text/JSON renderers, help entry, and CLI regression coverage. |
| PHASE7.6-5 | completed | AC-5 | Validate build, typecheck, focused/full tests, package dry-run, CLI smokes, and doctor latest-only. |

## Acceptance criteria

- AC-1: Catalog validation detects malformed capability/material/domain mappings.
- AC-2: Required domains and command mappings are represented without global material injection.
- AC-3: Doctor reports Phase 7.6 catalog visibility.
- AC-4: CLI exposes text and JSON inspection for agent capabilities.
- AC-5: Validation gates pass and latest doctor remains clean.

## Evidence links

- Catalog: `packages/core/src/registries/agent-capability-catalog.ts`
- Core export: `packages/core/src/registries.ts`
- Doctor check: `packages/core/src/doctor/checks/registries.ts`; `packages/core/src/doctor/doctor.ts`
- CLI command: `packages/cli/src/commands/registry/runtime.ts`
- CLI renderer: `packages/cli/src/renderers/registry-runtime.ts`
- Help text: `packages/cli/src/help.ts`
- Tests: `packages/core/src/registries/registries.test.ts`; `packages/core/src/doctor/doctor.test.ts`; `packages/cli/src/commands/cli-regression.test.ts`

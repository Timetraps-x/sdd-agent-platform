# Phase 7.7 Tasks — Command-scoped Team Runtime

## Task list

| Task | Status | Acceptance refs | Notes |
|---|---|---|---|
| PHASE7.7-1 | completed | AC-1, AC-2 | Add typed command team runtime registry with roles, command profiles, independence rules, validation, and inspection. |
| PHASE7.7-2 | completed | AC-3, AC-4 | Add deterministic command team decision API with activation, risk escalation, material routing, telemetry, and independence rule selection. |
| PHASE7.7-3 | completed | AC-5 | Add doctor visibility for command team runtime validation and failure reporting. |
| PHASE7.7-4 | completed | AC-6 | Add `sdd command-team inspect|validate|decide`, JSON output, text renderers, and help entry. |
| PHASE7.7-5 | completed | AC-7 | Validate build, typecheck, focused/full tests, package dry-run, CLI smokes, and doctor latest-only. |

## Acceptance criteria

- AC-1: Runtime inspection exposes command profiles, role profiles, and independence rules.
- AC-2: Runtime validation fails closed on unknown roles, domains, material packs, missing command profiles, and inline material policy.
- AC-3: Runtime decisions support `auto`, `force`, and `off` activation.
- AC-4: Verification/test role independence keeps design and executed evidence distinguishable.
- AC-5: Doctor reports Phase 7.7 command team runtime visibility.
- AC-6: CLI exposes text and JSON inspection, validation, and decision output.
- AC-7: Validation gates pass and latest doctor remains clean.

## Evidence links

- Runtime contract: `packages/core/src/registries/command-team-runtime.ts`
- Core export: `packages/core/src/registries.ts`
- Doctor check: `packages/core/src/doctor/checks/registries.ts`; `packages/core/src/doctor/doctor.ts`
- CLI command: `packages/cli/src/commands/registry/runtime.ts`
- CLI renderer: `packages/cli/src/renderers/registry-runtime.ts`
- Help text: `packages/cli/src/help.ts`
- Tests: `packages/core/src/registries/registries.test.ts`; `packages/core/src/doctor/doctor.test.ts`; `packages/cli/src/commands/cli-regression.test.ts`

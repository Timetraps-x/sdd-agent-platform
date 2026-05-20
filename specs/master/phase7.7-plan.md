# Phase 7.7 Plan — Command-scoped Team Runtime

## Implementation steps

1. Add the Phase 7.7 command team runtime contract version.
2. Implement the command team runtime registry in core:
   - role profiles;
   - command profiles;
   - independence rules;
   - inspection API;
   - validation API;
   - deterministic decision API.
3. Reuse Phase 7.6 capability catalog validation for role domain/material pack consistency.
4. Export the runtime through the stable `@sdd-agent-platform/core/registries` subpath.
5. Add doctor visibility for `command_team_runtime`.
6. Add CLI command cases for `command-team inspect`, `command-team validate`, and `command-team decide`.
7. Add text renderers for inspection, validation, and decision output while preserving JSON opt-in.
8. Extend focused registry/doctor/CLI regression tests.
9. Validate with full build/typecheck/test/pack and SDD command-team smokes.
10. Close phase documents and update Phase Status.

## Files changed

- `packages/core/src/contracts.ts`
- `packages/core/src/registries/command-team-runtime.ts`
- `packages/core/src/registries.ts`
- `packages/core/src/doctor/checks/registries.ts`
- `packages/core/src/doctor/doctor.ts`
- `packages/cli/src/commands/registry/runtime.ts`
- `packages/cli/src/renderers/registry-runtime.ts`
- `packages/cli/src/help.ts`
- `packages/core/src/registries/registries.test.ts`
- `packages/cli/src/commands/cli-regression.test.ts`

## Validation plan

- `npm run build`
- focused registry/doctor/CLI tests
- `npm run typecheck`
- `npm test`
- `npm pack --dry-run --json`
- `npm run sdd -- command-team inspect`
- `npm run sdd -- command-team validate --json`
- `npm run sdd -- command-team decide --command verify --risk runtime_evidence`
- `npm run sdd -- doctor --latest-only --branch master`

## Risk controls

- Keep the runtime deterministic and registry-backed.
- Keep role output summary-only and artifact-backed.
- Preserve command runners as workflow decision owners.
- Fail closed on invalid registry/capability references.
- Avoid broad imports or root core barrel reintroduction.

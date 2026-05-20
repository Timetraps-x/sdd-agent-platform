# Phase 7.8 Plan — Sync-back, Ship and Observability

## Implementation steps

1. Update Phase 7.8 status to `in_progress` and create research/spec/plan/tasks documents.
2. Add sync-back approval card data to the existing inspection result and render it in text/JSON output.
3. Add release document template/rendering support for `specs/<branch>/release.md`.
4. Implement `sdd ship` as a readiness/release-doc command with `--branch`, `--dry-run`, and `--json`.
5. Add compact statusline/progress projection using existing status/runtime/team/test/evidence signals.
6. Productize doctor fast/deep naming and recover guidance without changing default fast behavior.
7. Update help, instructions, generated entries, and docs where needed.
8. Add focused tests for approval card, ship/release doc, statusline/progress, and doctor fast/deep/recover guidance.
9. Run focused and full validation gates.
10. Write validation doc and close Phase 7.8 in Phase Status.

## Primary touchpoints

- `packages/core/src/sync-back/inspect.ts`
- `packages/core/src/sync-back/sync-back.test.ts`
- `packages/cli/src/commands/sync-back.ts`
- `packages/cli/src/renderers/workflow.ts`
- `packages/core/src/config/starter-documents.ts`
- `packages/core/src/config/init-project.ts`
- `packages/core/src/status/project-status.ts`
- `packages/cli/src/commands/doctor.ts`
- `packages/core/src/doctor/doctor.ts`
- `packages/cli/src/dispatch.ts`
- `packages/cli/src/help.ts`
- `packages/core/src/instructions.ts`
- `packages/core/src/ai-tools.ts`
- `packages/cli/src/commands/cli-regression.test.ts`

## Validation plan

- `npm run build`
- focused tests for sync-back, ship/statusline/doctor, and CLI regression
- `npm run typecheck`
- `npm test`
- `npm pack --dry-run --json`
- `npm run sdd -- sync-back inspect ...` where a local eligible run exists or a focused test covers the contract
- `npm run sdd -- ship --branch master --dry-run`
- `npm run sdd -- doctor fast --branch master`
- `npm run sdd -- doctor deep --branch master`
- `npm run sdd -- doctor --latest-only --branch master`

## Risk controls

- Keep release output semantic and branch-scoped.
- Keep approval output compact and digest-backed.
- Keep doctor deep explicit.
- Avoid remote, publish, deploy, git push, tag, or destructive cleanup actions.
- Preserve existing command semantics and JSON compatibility where practical.

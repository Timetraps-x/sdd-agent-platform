# Phase 7.3 Plan — Workflow State Resolver and Performance Read Path

## Gate 0 — Research and scope freeze

- Review Phase 7.2 Runtime Storage v2 implementation.
- Map status/tasks/doctor/sync-back read paths.
- Confirm fast-path/deep-path boundary.

## Gate 1 — Resolver contract

- Add `packages/core/src/workflow-state/resolve.ts`.
- Add `packages/core/src/workflow-state.ts` public facade.
- Add `WORKFLOW_STATE_RESOLVER_CONTRACT_VERSION`.
- Export `@sdd-agent-platform/core/workflow-state`.

## Gate 2 — Status and projection path

- Rewire `getProjectStatus()` to call `resolveWorkflowState()`.
- Persist compact `workflow_state` projection in runtime store.
- Preserve existing status output contract.

## Gate 3 — Sync-back resolver path

- Rewire implicit sync-back run lookup to resolver output.
- Rewire affected-file conflict calculation away from run-index rebuild.
- Preserve existing sync-back inspection/apply behavior.

## Gate 4 — Doctor latest-only fast path

- Use resolver shallow summary for `doctor --latest-only`.
- Preserve all-runs/deep evidence checks for historical and trust diagnostics.

## Gate 5 — Validation

```powershell
node --test --import tsx packages/core/src/workflow-state/resolve.test.ts packages/core/src/status/project-status.test.ts packages/core/src/sync-back/sync-back.test.ts packages/core/src/doctor/doctor.test.ts
npm run typecheck
```

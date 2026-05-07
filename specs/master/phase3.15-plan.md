# Phase 3.15 Plan

## Approach

Adopt option A from the workflow main-path design discussion: make `sdd do task` a facade over the Phase 3 executor artifact ingestion path.

## Steps

1. Change `runSingleTaskLoop` so supplied artifacts are routed through `runBackgroundExecutor` with deterministic `B-<task>-<agent>-001` delegation ids.
2. Use the ingestion result as the source of truth for accepted artifact path, result status, gaps, and terminal workflow status.
3. Preserve existing required artifact behavior for reviewer and validator artifacts, plus optional implementer/debugger artifacts.
4. Keep sync-back proposal generation after the required artifacts are accepted.
5. Extend the single-task loop test to assert artifact ingestion records and doctor latest-only compatibility.
6. Run repository validation and a real install-to-uninstall full-chain smoke.
7. Record Phase 3.15 retained docs and phase status.

## Validation Plan

- `npm run typecheck`
- `npm test`
- `npm run build`
- Full-chain smoke from package/global install through target repo init, artifact template, artifact validate, `sdd do task`, artifact ingestions, verify, sync-back, status/run inspect, doctor, and uninstall.

## Risks

- If `runSingleTaskLoop` calls ingestion after delegations are terminal, Phase 3.6 will reject the artifact. The implementation must create/reuse `RUNNING` executor delegations before ingestion.
- If local run index is not rebuilt after run mutation, doctor can warn on stale index. Tests and smoke should include index rebuild when asserting doctor cleanliness.

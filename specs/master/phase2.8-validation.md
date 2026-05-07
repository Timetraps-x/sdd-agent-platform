# Phase 2.8 Validation

## Status

completed

## Commands

- `npm run typecheck` — PASS after core API implementation.
- `npm run typecheck` — PASS after CLI/instruction entry implementation.
- `npm run build` — PASS before refreshing generated entries.
- `node ./dist/packages/cli/src/main.js update` — PASS, refreshed managed `.claude` entries.
- `npm run typecheck` — PASS after automated tests.
- `npm test` — PASS, 38 tests covering CLI help, run list/inspect/status, sync-back inspect/apply/idempotence/rejection.
- `npm run build` — PASS after automated tests.
- `node ./dist/packages/cli/src/main.js --help` — PASS.
- `node ./dist/packages/cli/src/main.js doctor` — PASS.
- `node ./dist/packages/cli/src/main.js status` — PASS.
- `node ./dist/packages/cli/src/main.js run list` — PASS.
- `node ./dist/packages/cli/src/main.js run inspect 20260501-020` — PASS.
- Real target read-only smoke in `D:\project\inshn-etalk-web`:
  - `doctor` — FAIL only for generated `.claude` entry drift from the new Phase 2.8 entry templates; no target write was performed.
  - `status` — PASS, recommends `sdd sync-back inspect 20260506-002 --branch master --task T001`.
  - `run list` — PASS.
  - `run inspect 20260506-002` — PASS.
  - `sync-back inspect 20260506-002 --task T001` — PASS, reports ready and does not write `tasks.md`.

## Pending

None.

## Notes

`sync-back apply` remains a write operation and was not run against the real target repository. The target repository's generated Claude Code entries can be refreshed later with explicit approval for `sdd update`.

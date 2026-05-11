# Phase 6.2 Validation: RC Stabilization

## Validation Matrix

| Area | Command / Check | Required |
|---|---|---|
| Type safety | `npm run typecheck` | yes |
| Unit/integration tests | `npm test` | yes |
| Build | `npm run build` | yes |
| Package contents | `npm pack --dry-run` | yes |
| Built CLI smoke | `node ./dist/packages/cli/src/main.js status` | yes |
| Focused Phase 6 regression | `node --test --import tsx --test-name-pattern "Phase 6|resident worker|worker-runtime|background executor|doctor|run inspect|branch" "packages/**/*.test.ts"` | recommended |
| SDD health | `sdd status --branch master` and `sdd doctor --latest-only` | recommended |

## Package Hygiene Checks

`npm pack --dry-run` output must not include:

- `.sdd/runs`
- `.sdd/run-index.json`
- `.claude/settings.local.json`
- temporary smoke directories
- local logs
- credentials or environment files

It should include only expected public package files such as:

- `dist`
- `README.md`
- `package.json`
- `tsconfig.build.json`

## Current Evidence

Status: PASS.

Evidence:
- `npm run typecheck` passed after core and CLI boundary extraction.
- Focused Phase 6 / branch / resident worker regression passed 46/46 before stabilization and targeted CLI regression passed 8/8 after CLI option extraction.
- `npm test` passed 136/136 in the final RC checklist.
- `npm run build` passed and emitted `dist`.
- `npm pack --dry-run` passed with 21 files and expected package contents: `dist`, `README.md`, `package.json`, `tsconfig.build.json`.
- `node ./dist/packages/cli/src/main.js status` passed and reported `context branch=master source=project_config`.
- `sdd run index rebuild --json` refreshed derived run-index evidence.
- `sdd doctor --latest-only` passed after rebuild: local run index current with 25 runs, 31 delegations, and 31 artifacts.

## Pass Criteria

- No TypeScript errors.
- No failing tests.
- Build emits usable `dist`.
- Package dry-run output is acceptable.
- Built CLI can run `status` from `dist/packages/cli/src/main.js`.
- Phase 6/6.1 resident worker runtime behavior remains unchanged.
- No new Phase 7.0 graph behavior is introduced in this phase.

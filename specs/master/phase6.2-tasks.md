# Phase 6.2 Tasks: RC Stabilization

## PHASE6.2-1 Add RC/Stabilization phase documents

### Boundary

- Add Phase 6.2 source, spec, plan, tasks, and validation docs.
- Update phase status/index chain between Phase 6.1 and Phase 7.0.
- Do not modify runtime behavior.

### Acceptance

- `phase-6.2-rc-stabilization.md` exists.
- `phase6.2-spec.md`, `phase6.2-plan.md`, `phase6.2-tasks.md`, `phase6.2-validation.md` exist.
- `PHASE_STATUS.md` shows Phase 6.2 between 6.1 and 7.0.
- `phases/README.md` lists Phase 6.2.

### Validation

```powershell
sdd status --branch master
```

## PHASE6.2-2 Stabilize core module boundaries

### Boundary

- Extract or organize low-risk cohesive logic from `packages/core/src/index.ts`.
- Preserve public exports through `packages/core/src/index.ts`.
- No changes to artifact ingestion, verify, sync-back, lifecycle gate, background/wave/resident worker completion semantics.

### Acceptance

- At least one low-risk core boundary is clearer or extracted.
- Public imports from `packages/core/src/index.ts` still work.
- Focused tests for affected APIs pass.

### Validation

```powershell
npm run typecheck
node --test --import tsx --test-name-pattern "branch|tasks inspect|artifact|lifecycle|doctor|resident worker|worker-runtime" "packages/**/*.test.ts"
```

## PHASE6.2-3 Stabilize CLI command/rendering boundaries

### Boundary

- Improve `packages/cli/src/main.ts` organization or renderer/option consistency.
- Preserve command names, flags, text/json contracts, and exit behavior unless fixing an inconsistency covered by tests.

### Acceptance

- CLI usage/help/next-action text is clearer for touched command families.
- Representative text and `--json` CLI tests pass.
- No command contract is removed.

### Validation

```powershell
npm run build
node ./dist/packages/cli/src/main.js status
node ./dist/packages/cli/src/main.js status --json
```

## PHASE6.2-4 Improve Phase 6/6.1 regression organization

### Boundary

- Preserve existing test coverage.
- Split or organize tests only where production seams are stable.
- Add targeted tests if splitting is too risky.

### Acceptance

- Phase 6/6.1 key paths remain covered: agent routing, team-mode, background executor, worker-runtime, run inspect, doctor.
- No regression test is removed without an equivalent replacement.

### Validation

```powershell
node --test --import tsx --test-name-pattern "Phase 6|resident worker|worker-runtime|background executor|doctor|run inspect" "packages/**/*.test.ts"
```

## PHASE6.2-5 Run RC validation and package smoke

### Boundary

- Run release-candidate validation only.
- Fix only stabilization defects found by the checklist.
- Do not add new feature scope.

### Acceptance

- Typecheck passes.
- Full tests pass.
- Build passes.
- Package dry-run output is acceptable.
- Built CLI can run `status`.
- Validation evidence is recorded in `phase6.2-validation.md` and `PHASE_STATUS.md`.

### Validation

```powershell
npm run typecheck
npm test
npm run build
npm pack --dry-run
node ./dist/packages/cli/src/main.js status
```

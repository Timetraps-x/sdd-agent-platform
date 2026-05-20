# Phase 7.0 Plan — Core Runtime Modularization

## Gate 0 — package/export/dist boundary

- Build packages into package-local `dist` directories.
- Add explicit core subpath exports for domain façades.
- Add CLI boundary regression to forbid `core/src`穿透和 root core import。

## Gate 1 — doctor responsibility split

- Keep `packages/core/src/doctor/doctor.ts` as orchestrator.
- Move check families under `packages/core/src/doctor/checks/*`.
- Keep model/summary separate from check implementations.

## Gate 2 — router/routing split

- Keep `route-sdd-task.ts` as façade.
- Keep `routing.ts` as route orchestration.
- Extract routing rules、profile resolution、risk/autonomy policy、route projection/source attribution.

## Gate 3 — CLI registry command/renderer split

- Keep `packages/cli/src/commands/registry.ts` as façade.
- Split command handlers under `packages/cli/src/commands/registry/*`.
- Keep `packages/cli/src/renderers/registry.ts` as façade.
- Split renderer families into registry core/runtime/contracts/platform and router renderer.

## Gate 4 — renderer ownership cleanup

- Move doctor terminal renderer from core to CLI.
- Core keeps structured result and runtime contract ownership.
- CLI owns human text rendering and text/json switch.

## Gate 5 — final docs/status/validation

- Update Phase 7 artifact, Phase status, phase index, architecture doc, README.
- Run build/typecheck/test/pack and SDD smoke.

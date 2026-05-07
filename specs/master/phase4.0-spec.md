# Phase 4.0 Spec

## Goal

Turn npm package distribution from a broad idea into a staged, auditable Phase 4 plan with clear human gates.

## Problem

The previous Phase 4.0 plan mixed several different risk levels in one phase: package identity, `package.json` metadata, local packaging, npm dry-run, npm account/login instructions, real publish, and documentation adoption. That is too large and too risky to execute as one unit.

## Requirements

1. Split Phase 4 into executable sub-phases.
2. Keep real public publish separate from local metadata and dry-run work.
3. Record package identity candidates without forcing the final user decision.
4. Preserve GitHub direct install as the default documented path until public npm install is real and smoke-tested.
5. Keep code knowledge graph as Phase 5.
6. Make every Phase 4.x phase independently testable and stoppable.

## Acceptance

- Phase 4 index lists 4.0~4.4.
- Phase status lists 4.0~4.4 with planned gates.
- Validation index lists 4.0~4.4 validation docs.
- Phase 4.1~4.4 retained docs exist.
- `npm publish` appears only in explicitly human-gated Phase 4.4, while `npm publish --dry-run` belongs to Phase 4.3.
- Package identity candidates and registry query evidence are documented.

## Non-goals

- No package metadata implementation in Phase 4.0.
- No npm login.
- No npm pack.
- No npm publish dry-run.
- No real publish.

## Current Evidence

- `npm view sdd-agent-platform name version --json` returned npm E404 on 2026-05-07, suggesting no public package by that name was visible in the registry.
- `npm view @timetraps/sdd-agent-platform name version --json` returned npm E404 on 2026-05-07, suggesting no public package by that scoped name was visible in the registry.
- Scoped package publish still requires user-controlled npm account/scope ownership.

## Open Decisions

- Final package name: `sdd-agent-platform` vs `@<scope>/sdd-agent-platform`.
- Whether `@timetraps` is an available/owned npm scope.
- License value.
- First public version number.
- Whether Phase 4.4 should execute the first publish or only prepare a manual handoff.
# Phase 7.6 Plan — Agent Capability Upgrade

## Step 1 — Add capability catalog contract

- Add a Phase 7.6 catalog contract version.
- Create `packages/core/src/registries/agent-capability-catalog.ts`.
- Model domains, stages, authority classes, material packs, catalog entries, command mappings, and validation result types.

## Step 2 — Define built-in capability and material metadata

- Add built-in capabilities for norm discovery, uncertainty resolution, performance planning, verification design, evidence collection, sync-back risk review, release summary, and context curation.
- Add routed material packs for project norms, uncertainty maps, performance risk, verification design, and sync-back risk.
- Keep material policies compact: `summary_only` or `route_when_triggered` for active command mappings.

## Step 3 — Validate catalog boundaries

- Validate capability stages, inputs, outputs, confidence thresholds, material-pack references, required-domain references, and command material policy.
- Export the catalog through `@sdd-agent-platform/core/registries`.

## Step 4 — Add doctor visibility

- Add a doctor registry check for the Phase 7.6 catalog.
- Fail closed if project config cannot be read or catalog validation fails.
- Report counts for capability domains, routed material packs, and command mappings.

## Step 5 — Add CLI registry surface

- Add `sdd agent-capabilities list [--json]`.
- Add `sdd agent-capabilities validate [--json]`.
- Render domains, authorities, material policies, material budgets, and command mappings in compact text output.
- Add advanced help entry and CLI regression coverage.

## Step 6 — Validate and close out

- Run focused core/doctor/CLI tests.
- Run build, typecheck, full tests, package dry-run, CLI smokes, and doctor latest-only.
- Record Phase 7.6 validation evidence and update phase status.

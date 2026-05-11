# Phase 6.3 Tasks: Declarative Agent/Skill Capability Runtime

## PHASE6.3-1 Add Phase 6.3 documents and status chain

Boundary:
- Create Phase 6.3 phase artifact and execution docs.
- Update Phase 6/7 index and status chain.

Acceptance:
- Phase 6.3 appears between 6.2 and 7.0.
- Phase 7.0 depends on Phase 6.3 registry evidence.

Validation:
- Manual doc/index review.

## PHASE6.3-2 Implement merged runtime registry

Boundary:
- Extend project config with optional `agent_runtime`.
- Merge built-in and project-config profiles/capabilities/sources.
- Keep built-ins as mandatory baseline.

Acceptance:
- Inspection APIs show built-in entries when no config exists.
- Project-declared profile/capability/source entries are visible when configured.
- Duplicate IDs and unresolved capability requirements fail validation.

Validation:
- Focused runtime registry tests.

## PHASE6.3-3 Make routing registry-backed

Boundary:
- Resolve task agent metadata through merged registry and aliases.
- Apply routing rules without hardcoding domain agents.
- Derive required capabilities from profile requirements and rule hits.

Acceptance:
- A project-declared profile can be recommended by `tasks route`.
- Route decision exposes alias resolution, rule hits, registry sources, and warnings.
- Existing Phase 6 routing remains compatible.

Validation:
- Focused `tasks route` tests and CLI JSON smoke.

## PHASE6.3-4 Harden quarantine and validation

Boundary:
- Extend external source inspection to project-declared sources.
- Keep external material declarative and quarantined.
- Fail closed on unsafe declarations.

Acceptance:
- Project-declared external source can be inspected.
- Quarantined sources do not become prompt imports or completion authority.
- Missing attribution/evidence or unsafe direct execution fails validation.

Validation:
- Invalid config tests.

## PHASE6.3-5 Add CLI/test validation and record evidence

Boundary:
- Extend existing CLI renderers.
- Add regression tests.
- Run focused/full validation and update evidence.

Acceptance:
- `npm run typecheck`, focused tests, `npm test`, and `npm run build` pass.
- Built CLI smoke passes.
- Validation evidence is recorded.

Validation:
```powershell
npm run typecheck
node --test --import tsx --test-name-pattern "Phase 6|Phase 6.3|agent runtime|skill-capabilities|capability-sources|external-packs|team-mode|tasks route" "packages/**/*.test.ts"
npm test
npm run build
```

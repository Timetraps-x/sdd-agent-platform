# Phase 6.3 Spec: Declarative Agent/Skill Capability Runtime

## Goal

Allow SDD projects to declare additional agent profiles, skill capabilities, capability sources, aliases, and routing rules in `.sdd/project.yml`, then merge them with Phase 6 built-ins into a validated runtime registry that can be inspected and used by routing.

## Problem

Phase 6 currently exposes useful contracts for agents, skills, sources, team-mode, and routing, but the runtime catalog is still largely hardcoded. This blocks safe scheduling of project-specific agents/skills that are not part of the built-in SDD material catalog and encourages future growth through prompt accumulation or router if/else expansion.

## Scope

- Optional `agent_runtime` project config contract.
- Merged runtime registry with origin metadata.
- Project-declared profile/capability/source inspection.
- Registry-backed route profile/capability resolution.
- Alias and routing rule support.
- External source quarantine visibility.
- Validation that fails closed on unsafe or unresolved declarations.
- CLI and test coverage for project-declared runtime entries.

## Non-goals

- No arbitrary prompt import.
- No direct execution of third-party agent packs.
- No Phase 8 code graph implementation.
- No hardcoded domain-agent special cases.
- No removal of Phase 6 built-in baseline behavior.

## Acceptance criteria

| Area | Required behavior |
|---|---|
| Backward compatibility | Existing Phase 6 runtime/router/team-mode behavior remains valid without `agent_runtime`. |
| Config declarations | `.sdd/project.yml` can add project profiles, skill capabilities, sources, aliases, and routing rules. |
| Registry | Inspection APIs return built-in plus project-config entries with source/origin metadata. |
| Router | `tasks route` can recommend a project-declared profile and required capabilities. |
| Explainability | Route decisions expose alias resolutions, routing rule hits, registry sources, and quarantine warnings. |
| Safety | Invalid declarations fail validation and do not silently fall back. |
| Quarantine | External material remains declarative/quarantined unless explicitly mapped through validated contracts. |
| Validation | Focused Phase 6.3 tests, full tests, typecheck, build, and CLI smoke pass. |

## Validation commands

```powershell
npm run typecheck
node --test --import tsx --test-name-pattern "Phase 6|Phase 6.3|agent runtime|skill-capabilities|capability-sources|external-packs|team-mode|tasks route" "packages/**/*.test.ts"
npm test
npm run build
node ./dist/packages/cli/src/main.js agent-runtime validate --json
node ./dist/packages/cli/src/main.js tasks route ONBOARDING-1 --json
```

# Phase 6.3 Validation: Declarative Agent/Skill Capability Runtime

## Validation Matrix

| Area | Command / Check | Required |
|---|---|---|
| Type safety | `npm run typecheck` | yes |
| Focused regression | `node --test --import tsx --test-name-pattern "Phase 6|Phase 6.3|agent runtime|skill-capabilities|capability-sources|external-packs|team-mode|tasks route" "packages/**/*.test.ts"` | yes |
| Unit/integration tests | `npm test` | yes |
| Build | `npm run build` | yes |
| Runtime validation | `node ./dist/packages/cli/src/main.js agent-runtime validate --json` | yes |
| Built CLI routing smoke | `node ./dist/packages/cli/src/main.js tasks route ONBOARDING-1 --json` | yes |
| SDD health | `sdd doctor --latest-only` | recommended |

## Current Evidence

Status: PASS.

Evidence:
- `npm run typecheck` passed.
- Focused regression `node --test --import tsx --test-name-pattern "Phase 6|Phase 6.3|agent runtime|skill-capabilities|capability-sources|external-packs|team-mode|tasks route" "packages/**/*.test.ts"` passed: 7/7.
- `npm test` passed: 138/138.
- `npm run build` passed.
- Built CLI runtime validation `node ./dist/packages/cli/src/main.js agent-runtime validate --json` passed: `valid=True`, `issues=0`, `version=phase-6.0-agent-skill-team-runtime-v1`.
- Built CLI routing smoke `node ./dist/packages/cli/src/main.js tasks route ONBOARDING-1 --json` passed: `taskId=ONBOARDING-1`, `recommendedProfile=researcher`, `category=implementation_review`, `capabilities=host.search.grep_glob,claude.subagent.researcher,context7.docs`.
- `sdd doctor --latest-only` passed after `sdd update` refreshed managed AI entry projections.

## Pass Criteria

- Existing Phase 6 behavior remains compatible when `agent_runtime` is absent.
- Project config can declare non-built-in agent profiles, skill capabilities, and capability sources.
- Runtime inspection and validation include project-config declarations.
- Router can schedule a project-config profile and explain alias/rule/capability decisions.
- Invalid declarations fail closed with actionable validation issues.
- External material remains declarative/quarantined and does not become prompt import or lifecycle authority.
- Typecheck, focused regression, full tests, build, and built CLI smoke pass.

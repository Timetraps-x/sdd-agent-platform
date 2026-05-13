# Phase 5.8 Plan

## Metadata

- phase_id: `5.8`
- plan_id: `phase5.8-semantic-document-contracts-plan`
- depends_on: `5.7`
- blocks: `5.9`

## Requirement Trace

| Spec Item | Plan Section | Design Response |
|---|---|---|
| AC-5.8-1 | P1, P2 | Upgrade shared spec template and init spec scaffold. |
| AC-5.8-2 | P1, P2 | Upgrade shared tasks template and init tasks scaffold. |
| AC-5.8-3 | P3, P4 | Update instructions, AI entries, generated commands, docs, and tests. |

## Implementation Slices

### P1: Shared templates

- Update `templates/spec-template.md` to lightweight requirement contract.
- Update `templates/tasks-template.md` to execution/evidence contract.

### P2: Init scaffolds

- Update `renderInitSpecDocument` and `renderInitTasksDocument` in `packages/core/src/index.ts`.
- Keep onboarding docs useful without pretending starter content is a real feature.

### P3: Instructions and generated entries

- Update `packages/core/src/instructions.ts` spec/tasks payloads.
- Update `packages/core/src/ai-tools.ts` `/sdd:spec` and `/sdd:tasks` generated entries.
- Run `npm run sdd -- update`.

### P4: Docs and tests

- Update user-facing docs describing the three-layer contract.
- Add tests for init scaffold, instructions, and generated entries.

## Validation Strategy

- `npm test`
- `npm run build`
- `npm run sdd -- instructions spec --json`
- `npm run sdd -- instructions tasks --json`
- `npm run sdd -- update`

## Risks

- Avoid turning `spec.md` into a full PRD system.
- Avoid turning `tasks.md` into Jira/TAPD replacement.

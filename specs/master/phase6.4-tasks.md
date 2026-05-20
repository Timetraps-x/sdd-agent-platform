# Phase 6.4 Tasks: Spec Partition Entry

## PHASE6.4-1 Add Phase 6.4 documents and status chain

Boundary:
- Create Phase 6.4 phase artifact and execution docs.
- Insert Phase 6.4 before later Phase 6.x stages, Phase 7.0 core modularization, and Phase 8.0 code graph.

Acceptance:
- Phase 6.4 appears in phase index/status.
- Phase 6.5 depends on Phase 6.4.

Validation:
- Manual doc/index review.

## PHASE6.4-2 Implement workflow partition resolver

Boundary:
- Add a shared resolver for raw branch -> safe partition -> spec root.
- Support explicit branch and current Git branch fallback.
- Keep safe path constraints.

Acceptance:
- Branch names with `/` map to stable safe partition ids.
- Missing branch outside Git gives actionable error.
- Legacy configured branch remains compatible where expected.

Validation:
- Focused unit tests.

## PHASE6.4-3 Make status a read-only branch view

Boundary:
- `sdd status` resolves current Git branch partition.
- `sdd status --branch <name>` resolves requested partition.
- Status must not create specs directories or switch context.

Acceptance:
- Missing current partition reports `not_started` and next `/sdd:spec`.
- Explicit branch status reports the requested partition even when current Git branch differs.
- Existing `--branch master` status path remains compatible.

Validation:
- CLI/core status tests.

## PHASE6.4-4 Update `/sdd:spec` entry guidance

Boundary:
- Update instruction payloads/generated entry wording.
- `/sdd:spec` is documented as branch/partition creation entry.
- Remove branch creation guidance from `init` docs/output where practical.

Acceptance:
- Generated `/sdd:spec` guidance says omitted `--branch` uses current Git branch.
- `status` guidance says it is read-only.
- No new slash command is introduced.

Validation:
- Generated instruction/update smoke.

## PHASE6.4-5 Add spec revision/hash and stale downstream detection

Boundary:
- Track current spec hash/revision.
- Detect plan/tasks stale when based-on metadata or content hash no longer matches.
- Reflect stale state in status and next command.

Acceptance:
- Re-running `/sdd:spec` after plan/tasks exist marks downstream stale.
- Stale plan/tasks cannot be silently treated as current.

Validation:
- Focused stale document tests.

## PHASE6.4-6 Validate and record evidence

Boundary:
- Run focused/full validation.
- Update validation evidence and phase status after PASS.

Acceptance:
- Typecheck, focused tests, full tests, build pass.
- `phase6.4-validation.md` records evidence.

Validation:
```powershell
npm run typecheck
node --test --import tsx --test-name-pattern "Phase 6.4|branch|partition|status|spec revision" "packages/**/*.test.ts"
npm test
npm run build
```

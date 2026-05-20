# Phase 6.4 Plan: Spec Partition Entry

## Strategy

Implement the smallest workflow UX correction before changing run isolation. Keep command surface stable: no new slash command, no `workflow start`. Introduce one resolver that every branch-sensitive path can share, but give each caller an explicit mode so `/sdd:spec` may create a partition while `status` remains read-only.

## Work tracks

### 1. Phase docs and chain

- Add Phase 6.4 phase artifact and execution docs.
- Insert 6.4 between 6.3 and later Phase 6.x/7.0/8.0 stages in indexes and status.
- Update Phase 8.0 handoff wording to consume 6.4/6.5 evidence after Phase 7.0 core modularization.

### 2. Partition resolver

- Add a branch-to-partition resolver near existing `resolveSddContext`.
- Prefer explicit branch when supplied.
- Otherwise read current Git branch for workflow/status contexts.
- Convert raw branch names into stable safe partition ids.
- Preserve legacy configured/default branch behavior only where needed for compatibility.

### 3. `/sdd:spec` entry semantics

- Update instruction payloads and generated entry wording so `/sdd:spec` is the workflow partition entry.
- In entry mode, create `specs/<partition>/` when missing.
- Keep downstream stages from requiring repeated `--branch` in normal guidance.

### 4. Read-only status branch view

- Make `sdd status` default to the current Git branch partition.
- Make `sdd status --branch <name>` read the requested partition.
- Do not create specs folders or switch workflow context from status.
- Show `not_started` with next `/sdd:spec` guidance when partition docs are missing.

### 5. Spec revision and downstream stale detection

- Track current spec hash/revision in parsed branch status.
- Track whether plan/tasks are based on the current upstream document hash.
- On repeated `/sdd:spec`, stale downstream plan/tasks should be visible in status and recommended next command.

### 6. Tests and validation

- Add focused tests for current Git branch fallback, explicit branch view, safe partition mapping, and stale detection.
- Run focused and full validation.
- Record evidence in `phase6.4-validation.md`.

## Risk controls

- `status` remains read-only to avoid surprising directory creation.
- Resolver mode makes creation an explicit behavior of workflow entry, not a side effect of every command.
- Keep explicit `--branch` compatibility for existing scripts.
- Use stable mapping for unsafe Git branch names so repeated commands locate the same partition.
- Do not remove existing `specs/master` support in one step.

## Implementation order

1. Add docs and status chain.
2. Implement branch-to-partition resolver and current Git branch detection.
3. Wire resolver into status read path.
4. Update `/sdd:spec` instruction/generation semantics.
5. Add spec hash/revision stale detection.
6. Add regression tests.
7. Run validation and update evidence.

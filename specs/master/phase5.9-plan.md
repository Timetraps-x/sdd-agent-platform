# Phase 5.9 Plan

## Metadata

- phase_id: `5.9`
- plan_id: `phase5.9-task-contract-parser-inspect-plan`
- depends_on: `5.8`
- blocks: `5.10`

## Implementation Slices

### P1: Task model compatibility

- Confirm existing parser support for task contract fields.
- Extend types only where fields are not surfaced.

### P2: Inspect output

- Add concise evidence lines for acceptance refs, plan refs, allowed agents, required artifacts, verification availability, and autonomy.

### P3: Regression tests

- Add parser and CLI output tests.
- Keep ERP acceptance companion-section regression covered.

## Validation Strategy

- `npm test`
- `npm run build`
- CLI smoke for `sdd tasks inspect` on a task containing the new fields.

## Risks

- Task parser must remain tolerant for existing docs.

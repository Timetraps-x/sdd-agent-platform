# SDD Task Contract

## Header

- contract: `sdd-task-v1`
- version: `1.3.0`
- phase: `1.3`
- storage: `tasks.md` fenced block
- owner: `core/task-model`
- writer: tasks command or user edit
- readers: task parser, do command, validator, overlap gate, future graph

## Purpose

`sdd-task` is the structured task metadata block embedded in `tasks.md`. It lets future parser/validator/runtime consume task identity, dependencies, boundaries, affected files, validation, and risk without scraping free text only.

## Required Block

````markdown
```sdd-task
id: T1
status: pending
wave: 1
depends_on: []
affected_files:
  - path/to/file
validation:
  - command string
risk: []
```
````

## Required Companion Sections

Each task should include these Markdown sections after the block:

```markdown
#### Boundary

Allowed and forbidden implementation scope.

#### Acceptance

- Verifiable acceptance item.

#### Implementation Notes

Reserved for sync-back proposal references or user-approved notes.
```

## Rules

- `id` must be stable within a spec branch.
- `status` values: `pending`, `in_progress`, `completed`, `blocked`, `deferred`.
- `depends_on` references other task ids.
- `wave` is graph-ready metadata for future dependency waves; Phase 1.3 does not execute waves.
- `affected_files` is a declared boundary and future overlap gate input.
- `validation` contains command declarations, not command results.

## Extension Points

Add fields such as `acceptance_ids`, `owners`, `estimated_risk`, or `graph_tags` as additive metadata. Do not remove required fields without a new contract version.

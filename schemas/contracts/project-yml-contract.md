# Project YAML Contract

## Header

- contract: `sdd-project-yml-v1`
- version: `1.3.0`
- phase: `1.3`
- storage: `.sdd/project.yml`
- owner: `core/project-config`
- writer: `init command` or user edit
- readers: CLI, doctor, command gate, validator, future graph

## Purpose

`.sdd/project.yml` is the project adapter entry point. It declares project identity, SDD directories, validation commands, editing preferences, runtime boundaries, lifecycle profiles, and risk confirmation hints. It is not a plugin loader.

## Contract ID Compatibility

- Canonical Phase 1.3 contract id: `sdd-project-yml-v1`. New templates and newly initialized `.sdd/project.yml` files must use this id.
- Legacy Phase 1.2 contract id accepted for existing project config evidence: `phase-1.2-project-contract`.
- Phase 1.3 readers and doctor specs should treat an existing `.sdd/project.yml` with the legacy id as `WARN` rather than `FAIL` when the required sections are present.
- Migration rule: update only the top-level `contract` id to `sdd-project-yml-v1` when the file is next intentionally edited or regenerated; do not rewrite user config automatically in Phase 1.3.
- Unknown contract ids remain `FAIL` for static compatibility checks.
## Required Shape

```yaml
contract: sdd-project-yml-v1
version: 1.3.0
project:
  name: string
  language: string
  framework: string
sdd:
  spec_dir: specs/<branch>
  docs_language: zh-CN
  compatible_with: spec-kit
validation:
  default:
    - command string
editing:
  prefer_hashline: true
  native_edit_fallback: true
runtime:
  background_write: false
  worktree_isolation: false
  sync_back_mode: proposal
lifecycle:
  decision_required: true
  profiles:
    - direct
    - compact
    - full
    - research
risk:
  confirm_required: []
```

## Rules

- `spec_dir` may contain `<branch>` and is resolved by runtime/command code in later phases.
- Validation commands are declarations only; adapters do not execute commands.
- Phase 1 requires `background_write: false` and `worktree_isolation: false`.
- Lifecycle profiles must use the canonical model in `docs/architecture/lifecycle-decision-model.md`.

## Extension Points

Additive fields may be added under `project`, `validation`, `risk`, and future `capabilities`. Removing or changing semantics requires a new contract version.

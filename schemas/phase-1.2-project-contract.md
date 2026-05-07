# Phase 1.2 Project Contract

## Contract

- contract id: `phase-1.2-project-contract`
- storage: `.sdd/project.yml`
- owner: `packages/core` project config module
- writer: `sdd init` or user edit
- readers: CLI, doctor, future command gate and validators

## Required shape

```yaml
contract: phase-1.2-project-contract
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
    - npm run typecheck
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
```

Phase 1.2 only validates required top-level sections and known runtime boundaries. Full adapter/template validation belongs to Phase 1.3+.

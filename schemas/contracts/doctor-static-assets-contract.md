# Doctor Static Assets Contract

## Header

- contract: `sdd-doctor-static-assets-v1`
- version: `1.3.0`
- phase: `1.3`
- storage: platform asset pack rules
- owner: `core/doctor`
- writer: platform maintainers
- readers: doctor command, CLI, release checklist, future graph

## Purpose

Defines read-only checks for platform static assets. Phase 1.3 only defines check rules; Phase 1.9 will harden doctor execution.

## Contract ID Compatibility Policy

- Static asset pack contracts/templates/adapters must use canonical Phase 1.3 `sdd-*-v1` ids.
- Existing `.sdd/project.yml` may use legacy `phase-1.2-project-contract`: doctor should report `WARN` when required sections exist, `FAIL` only when required sections/markers are missing or the id is unknown.
- Existing run evidence may use legacy ids `phase-1.2-run-state-contract`, `phase-1.2-event-log-contract`, or `phase-1.2-lifecycle-decision-contract`: doctor should accept these as historical evidence with `WARN` and should not auto-migrate them.
- New templates and new run records should use canonical Phase 1.3 ids; a Phase 1.2 id in a newly created Phase 1.3 template/static asset is `FAIL`.
## Required Checks

```yaml
contract: sdd-doctor-static-assets-v1
version: 1.3.0
checks:
  required_contracts:
    - schemas/contracts/project-yml-contract.md
    - schemas/contracts/run-state-contract.md
    - schemas/contracts/event-log-contract.md
    - schemas/contracts/lifecycle-decision-contract.md
    - schemas/contracts/sdd-task-contract.md
    - schemas/contracts/sdd-result-contract.md
    - schemas/contracts/delegation-liveness-contract.md
    - schemas/contracts/doctor-static-assets-contract.md
  required_templates:
    - templates/spec-template.md
    - templates/plan-template.md
    - templates/tasks-template.md
    - templates/project-template.yml
    - templates/sync-back-proposal-template.md
  required_adapters:
    - adapters/generic.yml
    - adapters/java-maven.yml
  required_commands:
    - commands/sdd-spec.md
    - commands/sdd-plan.md
    - commands/sdd-tasks.md
    - commands/sdd-do.md
    - commands/sdd-verify.md
    - commands/sdd-doctor.md
  required_agents:
    - agents/scout.md
    - agents/spec-reviewer.md
    - agents/planner.md
    - agents/implementer.md
    - agents/reviewer.md
    - agents/debugger.md
    - agents/validator.md
  required_workflows:
    - workflows/spec.yml
    - workflows/plan.yml
    - workflows/tasks.yml
    - workflows/do.yml
    - workflows/verify.yml
    - workflows/doctor.yml
  required_markers:
    - contract
    - version
```

## Path Canonicalization Checks

Doctor path diagnostics should distinguish three path scopes without auto-fixing:

| Scope | Example | Intended use |
|---|---|---|
| artifact-root-relative | `review-T3.md` | runtime helper input when creating/reading inside `artifactRoot` |
| run-relative | `artifacts/review-T3.md` | event/state artifact references inside `.sdd/runs/<run_id>` records |
| repo-relative | `.sdd/runs/<run_id>/artifacts/review-T3.md` | Markdown or cross-document references outside the run directory |

Report duplicate-prefix smells such as `artifacts/artifacts/...` or `.sdd/runs/<run_id>/artifacts/artifacts/...` as `WARN` in Phase 1.3 static review; future semantic validators may harden this to `FAIL`.
## Result Semantics

```text
PASS  all required assets exist and contain required markers
WARN  optional metadata missing or non-blocking version mismatch
FAIL  required asset missing, unreadable, or missing contract/version marker
```

## Rules

- Doctor is read-only in Phase 1.
- No auto-fix, no file generation, no dependency installation.
- Checks should report path, missing marker, and suggested owner.
- Static asset checks do not validate YAML/Markdown semantics beyond required markers in Phase 1.3.

## Extension Points

Later doctor versions may add schema parsing, compatibility matrix checks, command availability checks, and liveness checks.

# Phase 6.6 Tasks: Documentation Information Architecture

## PHASE6.6-1 Run documentation IA workflow through installed CLI

```sdd-task
id: PHASE6.6-1
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
  - AC-2
  - AC-3
  - AC-4
plan_refs:
  - "§2 Documentation IA proposal"
  - "§3 SDD workflow execution"
  - "§4 Evidence and scoring"
affected_files:
  - docs/documentation-information-architecture.md
  - specs/master/phase6.6-tasks.md
  - specs/master/phase6.6-validation.md
validation:
  - sdd --version
  - sdd status --branch master
  - sdd tasks inspect PHASE6.6-1 --branch master --json
  - sdd tasks route PHASE6.6-1 --branch master --json
  - sdd artifact validate <run_id> artifacts/implement-PHASE6.6-1.md --task PHASE6.6-1 --agent implementer --json
  - sdd do task PHASE6.6-1 --run <run_id> --implement-artifact artifacts/implement-PHASE6.6-1.md --review-artifact artifacts/review-PHASE6.6-1.md --validation-artifact artifacts/validation-PHASE6.6-1.md
  - sdd verify task PHASE6.6-1 --branch master --run <run_id>
  - sdd sync-back inspect <run_id> --task PHASE6.6-1 --branch master
  - sdd run index rebuild
  - sdd doctor --latest-only
risk:
  - documentation_reference_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.6-1.md
  - artifacts/review-PHASE6.6-1.md
  - artifacts/validation-PHASE6.6-1.md
verification_availability:
  - inspect:sdd status --branch master
  - inspect:sdd doctor --latest-only
  - inspect:sdd run index rebuild
autonomy: direct_execution_allowed
```

Boundary:

- Add the documentation IA proposal and record SDD workflow evidence.
- Use a locally packed CLI installed into an isolated npm prefix.
- Use the installed CLI for task routing, artifact writing, evidence ingestion, verify, sync-back, run-index, doctor, and uninstall evidence.
- Apply sync-back after PASS for this direct-safe documentation task.

Forbidden scope:

- Do not publish to npm.
- Do not commit or push.
- Do not bulk-move existing documentation files.
- Do not move runtime contract assets under `.claude/**`, `commands/**`, `agents/**`, `templates/**`, or `workflows/**`.
- Do not import or execute third-party prompt packs.

Acceptance:

- AC-1: Installed CLI reports version `0.2.0` and operates from the real repository despite existing uncommitted changes.
- AC-2: `docs/documentation-information-architecture.md` defines target categories, migration rules, and validation gates.
- AC-3: SDD workflow commands complete without blocking errors: status, inspect, route, run create, artifact template write, artifact validate, do, verify, sync-back, run-index, doctor.
- AC-4: Package uninstall completes and final report includes usability score plus tuning opportunities.

Definition of Done:

- Documentation IA proposal exists under `docs/`.
- Implementer, reviewer, and validator artifacts are stored in the run artifact directory.
- Verify status is PASS.
- Sync-back updates this task from pending to completed.
- Uninstall and scoring evidence are recorded in `phase6.6-validation.md`.

Evidence Expectations:

| Artifact | Expected Content |
|---|---|
| `artifacts/implement-PHASE6.6-1.md` | install/version/init-free repo workflow, IA doc creation, command evidence |
| `artifacts/review-PHASE6.6-1.md` | IA boundary review, high-risk path review, no-publish/no-commit confirmation |
| `artifacts/validation-PHASE6.6-1.md` | command validation, verify/sync-back/run-index/doctor/uninstall evidence, score |

## Dependency Notes

- Single-wave task; no background worker or worktree orchestration is required.
- The existing repository may contain uncommitted changes; this must not block SDD workflow execution.

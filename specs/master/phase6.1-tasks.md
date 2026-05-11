# Phase 6.1 Tasks: Resident Agent Worker Runtime

## Metadata

- phase_id: `6.1`
- status: `ready_for_execution`

## Task List

### PHASE6.1-1: Add resident worker runtime contract and storage

```sdd-task
id: PHASE6.1-1
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-6.1-1
  - AC-6.1-3
plan_refs:
  - "Phase 6.1 Plan §3 Runtime State"
affected_files:
  - packages/core/src/index.ts
validation:
  - node --test --import tsx --test-name-pattern "resident worker" "packages/**/*.test.ts"
risk: []
agent_fit:
  - implementer
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.1-1.md
  - artifacts/review-PHASE6.1-1.md
  - artifacts/validation-PHASE6.1-1.md
verification_availability:
  - inspect:sdd run inspect <run_id>
autonomy: direct_execution_allowed
```

#### Boundary

Add runtime record types, storage helpers, status derivation, and read/write/list/inspect helpers. Do not add daemon process management.

### PHASE6.1-2: Add resident worker claim and heartbeat APIs

```sdd-task
id: PHASE6.1-2
status: pending
wave: 2
depends_on:
  - PHASE6.1-1
acceptance_refs:
  - AC-6.1-1
  - AC-6.1-2
  - AC-6.1-4
plan_refs:
  - "Phase 6.1 Plan §2 Reused Mechanisms"
affected_files:
  - packages/core/src/index.ts
validation:
  - node --test --import tsx --test-name-pattern "resident worker" "packages/**/*.test.ts"
risk:
  - state-machine
agent_fit:
  - implementer
  - reviewer
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.1-2.md
  - artifacts/review-PHASE6.1-2.md
  - artifacts/validation-PHASE6.1-2.md
verification_availability:
  - inspect:sdd worker-runtime inspect <runtime_id> --run <run_id>
autonomy: direct_execution_allowed
```

#### Boundary

Claim must reuse background delegation claim. Heartbeat must not complete tasks or reactivate terminal delegations.

### PHASE6.1-3: Expose worker runtime through CLI, run inspect, and doctor

```sdd-task
id: PHASE6.1-3
status: pending
wave: 3
depends_on:
  - PHASE6.1-2
acceptance_refs:
  - AC-6.1-5
  - AC-6.1-6
plan_refs:
  - "Phase 6.1 Plan §4 CLI Surfaces"
  - "Phase 6.1 Plan §5 Evidence and Doctor"
affected_files:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
validation:
  - node --test --import tsx --test-name-pattern "worker-runtime|resident worker|Phase 6" "packages/**/*.test.ts"
  - npm run build
risk:
  - cli-surface
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.1-3.md
  - artifacts/review-PHASE6.1-3.md
  - artifacts/validation-PHASE6.1-3.md
verification_availability:
  - inspect:sdd doctor --latest-only
  - inspect:sdd run inspect <run_id>
autonomy: direct_execution_allowed
```

#### Boundary

CLI and doctor expose runtime state and safe next actions. They must not kill, restart, delete, or auto-complete resident workers.

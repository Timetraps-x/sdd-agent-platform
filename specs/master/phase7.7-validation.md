# Phase 7.7 Validation — Command-scoped Team Runtime

## Result

PASS.

## Commands

```powershell
npm run build
node --test --import tsx packages/core/src/registries/registries.test.ts packages/core/src/doctor/doctor.test.ts packages/cli/src/commands/cli-regression.test.ts
npm run typecheck
npm test
npm pack --dry-run --json
npm run sdd -- command-team inspect
npm run sdd -- command-team validate --json
npm run sdd -- command-team decide --command verify --risk runtime_evidence
npm run sdd -- doctor --latest-only --branch master
```

## Evidence summary

- `npm run build` passed after adding Phase 7.7 registry exports and CLI imports.
- Focused registry/doctor/CLI regression passed: 61 tests, 61 pass, 0 fail.
- `npm run typecheck` passed.
- `npm test` passed: 187 tests, 187 pass, 0 fail.
- `npm pack --dry-run --json` completed for `sdd-agent-platform@0.3.0` with 520 packed entries.
- `sdd command-team inspect` rendered runtime version `phase-7.7-command-team-runtime-v1` with 11 command profiles, 9 role profiles, and 4 independence rules.
- `sdd command-team validate --json` returned `valid: true` and no issues.
- `sdd command-team decide --command verify --risk runtime_evidence` returned `mode=team-lite`, selected verification designer, evidence runner, and context curator roles, and included `ind.verify.runner-designer`.
- Final `sdd doctor --latest-only --branch master` passed: 45 checks, 45 pass, 0 warn, 0 fail.

## Boundary checks

- Command team runtime is deterministic registry metadata, not an external agent OS.
- Role outputs remain summary-only and artifact-backed.
- Workflow-affecting command decisions remain owned by command runners and gates.
- Material packs are selected through role mappings and policy; no full material library is globally injected.
- Verification design and executed evidence remain independently visible through role and independence-rule separation.
- CLI exposes visibility without changing `/sdd:test`, `/sdd:verify`, or `/sdd:sync-back` semantics.

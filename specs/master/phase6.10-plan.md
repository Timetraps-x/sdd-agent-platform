---
contract: sdd-plan-doc-v1
---

# Plan: Context Budget Runtime and Non-authoritative Log Workers

## Metadata

- spec_id: `phase6.10-context-budget-runtime-log-workers`
- plan_id: `phase6.10-context-budget-runtime-log-workers`
- branch: `master`
- retained_plans:
  - `phase6.10-plan.md`

## 0.1 Requirement Trace

| Acceptance | Plan Section | Design Response |
|---|---|---|
| AC-1 | §3 Context Budget Contracts | Add stable runtime contracts for profiles, budgets, source refs, summaries, packages, and log workers. |
| AC-2, AC-3 | §4 Output Projection Profiles | Keep brief output concise while forensic mode exposes complete source evidence paths. |
| AC-4 | §5 Evidence Summary Projection | Produce hash-backed, non-authoritative evidence summaries. |
| AC-5, AC-6 | §6 Context Build Packages | Build deterministic mode/agent working sets. |
| AC-7, AC-8 | §7 Log Worker Boundary and Trust Guard | Allow non-authoritative logging/summaries only and reject derived summaries as PASS evidence. |
| AC-9, AC-10 | §8 Validation and Installed CLI Proof | Add budget regression and full installed CLI validation. |

## 1. Background / Context

Phase 6.7 reduced duplicated renderer output, and Phase 6.9 made evidence trust policy-backed. Long real workflow sessions still consume context too quickly because command outputs, run summaries, doctor reports, artifact evidence, and broad task docs repeatedly enter the main conversation.

The fix is not to let subagents decide workflow state. The fix is to split authority from projection: core runtime writes and validates source-of-truth state, while derived projections summarize with source paths/hashes and explicit non-authoritative markers.

## 2. Goals and Non-goals

Goals:

- Reduce main-session context residency for routine SDD commands.
- Preserve blockers, failures, next action, and trust policy facts in brief output.
- Provide forensic expansion paths when full evidence is needed.
- Build deterministic context packages for do/verify/sync-back/doctor and agent-specific handoff.
- Let subagents/log workers help with run logging and summarization only.

Non-goals:

- Do not make summaries or context packages authoritative.
- Do not replace Phase 6.9 trust evaluation.
- Do not add vector retrieval, graph DB, daemon, or remote worker fleet.
- Do not auto-apply sync-back or hide workflow stages.

## 3. Context Budget Contracts

Primary touchpoints:

- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`
- `packages/cli/src/main.ts`

Contracts:

```ts
type ContextProfile = 'brief' | 'normal' | 'forensic';

type ContextSourceRef = {
  path: string;
  hash: string;
  kind: 'artifact' | 'run_state' | 'ledger' | 'document' | 'command_output' | 'derived';
};

type CommandOutputSummary = {
  contract: 'sdd-command-output-summary-v1';
  authoritative: false;
  usableForPass: false;
  source: ContextSourceRef;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'UNKNOWN';
  highlights: string[];
  omittedLines: number;
};

type EvidenceSummaryProjection = {
  contract: 'sdd-evidence-summary-v1';
  authoritative: false;
  usableForPass: false;
  runId: string;
  taskId: string | null;
  sources: ContextSourceRef[];
  passCount: number;
  blockedCount: number;
  failCount: number;
  issueCodes: string[];
  highlights: string[];
};

type ContextBuildPackage = {
  contract: 'sdd-context-package-v1';
  profile: ContextProfile;
  mode: 'do' | 'verify' | 'sync-back' | 'doctor';
  agent?: string;
  authoritative: false;
  usableForPass: false;
  mustRead: ContextSourceRef[];
  optionalRead: ContextSourceRef[];
  doNotReadUnlessNeeded: ContextSourceRef[];
  nextCommands: string[];
  warnings: string[];
};
```

Rules:

- Derived contracts are projections only.
- Source refs must include paths and content hashes where the file exists.
- `authoritative=false` and `usableForPass=false` are mandatory on every projection.
- Runtime JSON names stay English and versioned.

## 4. Output Projection Profiles

Profiles:

- `brief`: blockers, current task, next action, counts, source refs.
- `normal`: brief plus selected evidence highlights and policy summary.
- `forensic`: complete evidence, findings, proposal content, and source paths.

Implementation:

1. Add reusable profile parsing and rendering helpers.
2. Keep existing JSON contracts additive.
3. Use brief defaults for human text where safe.
4. Preserve compact JSON behavior for automation.
5. Add budget tests for text renderers.

## 5. Evidence Summary Projection

Implementation:

1. Read run inspection / state / artifacts / ledger.
2. Collect acceptance coverage, artifact ingestion, trust issues, policy refs, and source artifacts.
3. Hash all source files used by the projection.
4. Render concise highlights and counts.
5. Return projection with `authoritative=false` and `usableForPass=false`.

Trust guard:

- Evidence summary must be rejected by artifact trust validation if referenced as `source_artifact` or source evidence for PASS.

## 6. Context Build Packages

Modes:

- `do`: task docs, route, required artifacts, implementation files if known.
- `verify`: validation artifacts, acceptance refs, trust policy, ledger/source artifacts.
- `sync-back`: proposal, digest, affected files, branch/run/task consistency.
- `doctor`: latest run, findings, document chain, trust summaries.

Agent packages:

- implementer gets task/plan/affected files and required artifact target.
- reviewer gets implementation artifact/source refs and review criteria.
- validator gets validation commands, acceptance refs, trust policy, source evidence requirements.

Each package is a working set, not an authority. It can guide reads but cannot decide PASS.

## 7. Log Worker Boundary and Trust Guard

Allowed log worker/subagent work:

- write command logs into run directories;
- summarize stored logs with source path/hash;
- archive verbose output;
- index run files for later retrieval.

Forbidden:

- deciding PASS/BLOCKED/FAIL;
- changing route, delegation, execution profile, doctor verdict, sync-back readiness, or artifact trust;
- producing user-visible workflow conclusions without core validation.

Doctor should flag log worker records that claim authority or lack non-authoritative markers.

## 8. Validation and Installed CLI Proof

Validation sequence:

```powershell
npm run typecheck
npm test -- --test-name-pattern "context budget|evidence summary|context build|log worker|derived summary"
npm test
npm run build
node ./dist/packages/cli/src/main.js context build --task PHASE6.10-8 --branch master --mode verify --json
node ./dist/packages/cli/src/main.js tasks inspect PHASE6.10-8 --branch master --json
node ./dist/packages/cli/src/main.js tasks route PHASE6.10-8 --branch master --json
node ./dist/packages/cli/src/main.js doctor --latest-only --branch master
npm pack --dry-run --json
```

Before marking complete, rebuild/package/install the tarball and run the installed CLI chain. Do not apply sync-back without explicit approval.

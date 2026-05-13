---
contract: sdd-plan-doc-v1
---

# Plan: Runtime Trust Layer and Fast Path Hardening

## Metadata

- spec_id: `phase6.9-runtime-trust-fast-path-hardening`
- plan_id: `phase6.9-runtime-trust-fast-path-hardening`
- branch: `master`
- retained_plans:
  - `phase6.9-plan.md`

## 0.1 Requirement Trace

| Acceptance | Plan Section | Design Response |
|---|---|---|
| AC-1 | §3 Trust Contract Foundation | Define CER, provenance, attestation, policy, route, ledger, sync-back, doctor, profile, and cache contracts before feature code. |
| AC-2, AC-3 | §4 Evidence Quality Gate | Block weak PASS while preserving honest BLOCKED/FAIL evidence and policy issue codes. |
| AC-4, AC-5, AC-6 | §5 Policy-backed Acceptance Coverage | Replace mention matching with deterministic policy decisions over CER/provenance/attestation facts. |
| AC-7, AC-8 | §6 Per-delegation Routing and Execution Normalization | Route every delegation independently and persist coherent policy snapshots. |
| AC-9 | §7 Invocation Ledger and Material Provenance | Record actual invocations as provenance activities and render usage only from ledger evidence. |
| AC-10 | §8 Sync-back State Machine and Run Semantics | Enforce monotonic writeback and actionable explicit-run behavior. |
| AC-11 | §9 Doctor Trust Suite | Add branch-scoped diagnostics for evidence policy, provenance, attestation, route, execution, invocation, sync-back, and cache gaps. |
| AC-12, AC-13 | §10 Profiling and Content-addressed Fast Paths | Measure hot phases and cache only derived facts, provenance fragments, and policy decisions with hash invalidation. |
| AC-14 | §11 Team-mode Cost Routing | Downgrade simple/read-only tasks while preserving high-risk hyperplan. |
| AC-15 | §12 Validation and Regression Plan | Validate through tests, deterministic fixtures, package dry-run, installed CLI, and EMP-style weak-evidence cases. |

## 1. Background / Context

EMP project usage showed that the SDD workflow can complete, but completion is not enough. The latest self-test exposed the same structural issues in this repository: `PHASE6.9-1` can verify PASS while acceptance coverage says only `Mentioned in artifacts/...`, generated validator template mapping can look like coverage evidence, reviewer/validator execution records can carry implementer route policy, and doctor/explicit-run behavior still depends on fragile runtime assumptions.

Phase 6.9 must therefore land as a coherent runtime trust layer. The stable path is to define CER/provenance/attestation/policy contracts first, then enforce artifact evidence, then make routing/invocation provenance reliable, then harden state/diagnostics, and only then add fast paths.

## 2. Goals and Non-goals

Goals:

- Make PASS evidence claim-based, reasoned, source-backed, provenance-backed, and policy-proven.
- Make acceptance coverage explicit about `PASS`, `FAIL`, `BLOCKED`, `REFERENCED_ONLY`, and `MISSING`.
- Ensure AC id/text mentions, copied acceptance text, artifact self-claims, and generated TODO mappings cannot become PASS.
- Persist route policy per delegation rather than per task-loop accident.
- Normalize execution records or record explicit policy reuse.
- Record append-only invocation evidence for agent, skill, tool, material, policy, and cache use.
- Keep sync-back monotonic and partition-aware.
- Make doctor the trust auditor, not only a structural smoke checker.
- Add profiling and caches only after correctness gates are stable.
- Reduce unnecessary high-cost team-mode where lifecycle risk allows.

Non-goals:

- Do not implement Phase 7 graph storage or graph queries.
- Do not add a daemon, remote worker fleet, external telemetry dependency, or graph database.
- Do not hide workflow commands or merge stages to make UX look shorter.
- Do not weaken validation gates, sync-back approval, or branch partition boundaries.
- Do not turn catalog/source availability into material usage.

## 3. Trust Contract Foundation

Primary touchpoints:

- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`
- run inspect / doctor / artifact validate JSON surfaces

Introduce and test stable internal contracts before behavior changes:

```ts
type EvidenceCoverageStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'REFERENCED_ONLY' | 'MISSING';
type EvidenceQualityIssue = 'EMPTY_EVIDENCE' | 'TODO_PLACEHOLDER' | 'TEMPLATE_TEXT' | 'MENTION_ONLY' | 'UNSOURCED_PASS' | 'MISSING_COMMAND_OUTPUT' | 'MISSING_ARTIFACT_REFERENCE' | 'MISSING_MATERIAL_REFERENCE' | 'PROVENANCE_GAP' | 'POLICY_RULE_FAILED';

type EvidenceClaim = {
  acceptanceId: string;
  claim: string;
  assertedStatus: EvidenceCoverageStatus;
  sourceArtifact: string;
};

type EvidenceReasoning = {
  summary: string;
  ruleIds: string[];
  issueCodes: EvidenceQualityIssue[];
};

type EvidenceItem = {
  acceptanceId?: string;
  sourceArtifact: string;
  evidenceText: string;
  commands: string[];
  artifactRefs: string[];
  materialRefs: string[];
  issues: EvidenceQualityIssue[];
};

type EvidenceCoverage = {
  acceptanceId: string;
  status: EvidenceCoverageStatus;
  claim?: EvidenceClaim;
  evidence: EvidenceItem[];
  reasoning?: EvidenceReasoning;
  policyDecision: PolicyDecision;
};

type ProvenanceEntity = { id: string; kind: 'spec' | 'plan' | 'tasks' | 'artifact' | 'command_output' | 'run_state' | 'material'; hash?: string; path?: string };
type ProvenanceActivity = { id: string; kind: 'inspect' | 'route' | 'do' | 'verify' | 'artifact_validate' | 'sync_back' | 'policy_evaluate' | 'cache'; startedAt?: string; endedAt?: string };
type ProvenanceAgent = { id: string; kind: 'runtime' | 'implementer' | 'reviewer' | 'validator' | 'tool' };
type ProvenanceLink = { relation: 'used' | 'wasGeneratedBy' | 'wasAssociatedWith' | 'wasDerivedFrom'; from: string; to: string };

type SddEvidenceAttestation = {
  subject: string;
  materials: ProvenanceEntity[];
  invocation: ProvenanceActivity;
  builder: ProvenanceAgent;
};

type PolicyRuleSet = { id: string; version: string; ruleIds: string[] };
type PolicyDecision = { status: EvidenceCoverageStatus; ruleSet: PolicyRuleSet; passedRules: string[]; failedRules: string[]; issueCodes: EvidenceQualityIssue[] };

type DelegationRoutePlan = {
  delegationId: string;
  taskId: string;
  agent: string;
  routeDecision: unknown;
  toolPermission: unknown;
  modelPolicy: unknown;
  routeHash: string;
};

type InvocationLedgerEntry = {
  kind: 'agent' | 'skill' | 'tool' | 'material' | 'policy_decision' | 'cache_hit' | 'cache_miss';
  runId: string;
  taskId?: string;
  delegationId?: string;
  name: string;
  status: 'started' | 'completed' | 'failed' | 'blocked' | 'skipped';
  inputHash?: string;
  outputArtifact?: string;
};
```

Rules:

- Contracts may evolve by versioned fields, not by silent meaning changes.
- Runtime JSON keys and status values remain English/stable.
- `EvidenceCoverage` is derived output; it must not become source evidence for another PASS.
- Existing run state is normalized on read where safe; new fields are written only by new code paths.

## 4. Evidence Quality Gate

Primary touchpoints:

- `validateSddResultArtifact`
- `validateSddResultMetadata`
- `ingestArtifactResult`
- task verify / sync-back evidence paths
- `artifact validate` CLI rendering

Algorithm:

1. Parse `sdd-result` metadata as today; do not weaken metadata validation.
2. Extract candidate CER claims from artifact sections, acceptance mappings, command summaries, artifact refs, material refs, and result statements.
3. Normalize referenced run files, commands, artifacts, agents, tasks, document hashes, and material refs into PROV-like entities, activities, agents, and links.
4. Emit in-toto/SLSA-style evidence attestations for validator/reviewer/implementer artifacts, including subject, materials, invocation, and builder.
5. Classify quality issues:
   - empty evidence;
   - TODO / placeholder text;
   - unmodified template text;
   - AC mention without evidence;
   - PASS with no claim, reasoning, command/material refs, source, or concrete assertion;
   - command listed but no result/assertion;
   - artifact/material referenced but no relationship to acceptance;
   - provenance or attestation missing for a PASS claim.
6. For PASS artifacts, any hard issue blocks successful ingestion.
7. For BLOCKED/FAIL artifacts, require explicit blocker/failure evidence and let that evidence override PASS-like references.
8. Persist issue codes in validation and ingestion results.

Acceptance boundary:

- `status: PASS` in fenced metadata is necessary but not sufficient.
- AC id, copied acceptance text, generated template TODO, or `Mentioned in artifacts/...` can never be PASS evidence.
- The gate must provide actionable diagnostics so agents can repair artifacts without guessing.

## 5. Policy-backed Acceptance Coverage

Primary touchpoints:

- task verify coverage generation around current mention matching;
- acceptance coverage artifact renderer;
- `RunState.tasks[taskId].acceptanceCoverage`.

Evaluation pipeline:

1. Parse accepted artifacts into candidate `EvidenceClaim`, `EvidenceItem`, and `EvidenceReasoning` records.
2. Build provenance facts from run state, event logs, agent execution records, command/material refs, document hashes, and artifact hashes.
3. Attach evidence attestations to the candidate claims they support.
4. Evaluate deterministic policy rules to produce one `PolicyDecision` per acceptance.
5. Render `EvidenceCoverage` from the decision; never infer PASS from text containment.

Classifier precedence:

```text
FAIL > BLOCKED > PASS > REFERENCED_ONLY > MISSING
```

Policy rules:

- `PASS` requires claim + evidence + reasoning + source artifact + command/material refs + no hard quality issue + valid provenance/attestation.
- `FAIL` wins if any evidence item explicitly fails the acceptance.
- `BLOCKED` is valid evidence but not PASS.
- `REFERENCED_ONLY` means an AC id/text appeared without proof.
- `MISSING` means no relevant evidence was found.

Renderer:

- Coverage rows must cite policy decision, evidence text, reasoning, provenance facts, attestation subject/materials, source artifact, command/material refs, blocker, assertion, and issue codes.
- Non-PASS rows remain actionable gaps and block verify/sync-back PASS.
- Coverage state must not collapse `REFERENCED_ONLY` into PASS for convenience.

## 6. Per-delegation Routing and Execution Normalization

Primary touchpoints:

- task route computation;
- task loop step/delegation builder;
- delegation liveness records;
- `AgentExecutionRecord` creation;
- run inspect and doctor renderers.

Design:

- Use Design A: route every delegation independently.
- Build a `DelegationRoutePlan` for each implementer/reviewer/validator candidate.
- Create only delegations accepted by their own route plan.
- Persist route plan hash and route decision on the delegation and execution record.
- Keep execution order stable after filtering rejected profiles.
- Require `profile`, `toolPermission.profile`, and route recommended/selected profile to align.
- If policy reuse is intentional, record `policyReuse.sourceProfile` and `policyReuse.reason`.

Doctor must report any mismatch without `policyReuse`.

## 7. Invocation Ledger and Material Provenance

Primary touchpoints:

- agent execution startup/finish;
- skill invocation surfaces where observable by SDD runtime;
- tool/material/source attribution;
- run inspect and doctor.

Design:

- Add `.sdd/runs/<run_id>/invocations.jsonl` as an append-only file-backed ledger.
- Record entries for observed agent, skill, tool, material, policy decision, cache hit, and cache miss events.
- Link entries to run id, task id, delegation id, route hash, artifact path, input/output hash, and provenance activity id where available.
- Distinguish declaration from invocation:
  - `capabilitiesUsed` is a declaration;
  - invocation ledger is evidence;
  - material catalog/source presence is availability;
  - material invocation is usage;
  - policy decision entries explain derived trust state, not source evidence.
- `materialsUsed` rendering, evidence attestation materials, and doctor usage claims must be ledger/provenance-backed.

Phase 6.9 should stay local/file-backed. Exporting to OpenTelemetry or a graph is Phase 7+ work.

## 8. Sync-back State Machine and Run Semantics

Primary touchpoints:

- verify state persistence;
- sync-back proposal creation;
- sync-back apply;
- sync-back inspect;
- explicit `--run` resolution.

State machine:

```text
not_created -> proposed -> applied
```

Rules:

- Disallow `applied -> proposed` and `applied -> not_created` for the same proposal identity.
- Proposal identity should include task id, run id, target file, before hash, after/patch hash, and applied marker.
- If current docs already include the applied task status, inspect returns `already-applied` or `noop` instead of reopening a proposal.
- New unapplied document deltas still require explicit approval gates.
- `do task --run <missing>` should fail with a friendly error telling the user to omit `--run` to create a run or create/choose an existing run.

## 9. Doctor Trust Suite

Primary touchpoints:

- CLI `doctor` option parsing;
- core `doctor` API;
- run state/event/artifact inspectors;
- local run index and latest-run scans.

Checks:

- Weak PASS evidence accepted by ingestion.
- Mention-only PASS coverage or generated template TODO coverage.
- Coverage row without policy decision, source artifact, evidence item, reasoning, provenance facts, or attestation materials.
- Delegation created despite router rejection.
- Execution record profile/toolPermission/route mismatch without policy reuse.
- Material usage declaration without invocation ledger/provenance entry.
- Sync-back regression from `applied` to `proposed`.
- Missing explicit-run friendly error path.
- Cache metadata missing required input hashes or serving stale route/task/policy models.
- Doctor branch/partition mismatch.

Doctor must accept branch/partition intent from CLI and must not silently inspect the current Git branch when `--branch` was provided.

## 10. Profiling and Content-addressed Fast Paths

Primary touchpoints:

- CLI command dispatcher;
- project/config/model parsing;
- document/task model builders;
- route computation;
- run index/latest-run scans;
- doctor and verify hot paths.

Profiling phases:

- project resolution;
- config load;
- document hash/read;
- document parse;
- task model build;
- route computation;
- run scan/index;
- evidence validation;
- cache lookup/read/write;
- render.

Cache model:

```ts
type RuntimeCacheKeyInput = {
  runtimeVersion: string;
  partition: string;
  command: string;
  projectConfigHash: string;
  specHash?: string;
  planHash?: string;
  tasksHash?: string;
  validationHash?: string;
  runStateHash?: string;
  artifactHash?: string;
  routerPolicyVersion?: string;
  optionsHash: string;
};
```

Rules:

- Cache only derived read models: document model, task model, route plan, latest-run summary, run index summaries, provenance graph fragments, and policy decisions.
- Bind cached evidence/provenance/policy outputs to source hashes and policy version.
- Never cache authoritative run state, source artifacts, or sync-back state transitions.
- Never skip evidence gates, provenance checks, policy evaluation, sync-back state guards, or doctor trust checks on a cache hit.
- Emit cache hit/miss profile entries when profiling is enabled.

## 11. Team-mode Cost Routing

Primary touchpoints:

- team-mode policy builder;
- lifecycle/risk classifier;
- route output and tests.

Cost classes:

- `direct`: small, local, low-risk tasks.
- `validator_only`: read-only verification or inspection.
- `implementation_review`: normal implementation with review/validation.
- `hyperplan`: API/schema/security/data/migration/high-blast-radius work.

Rules:

- Preserve explicit user/team-mode overrides.
- Preserve hyperplan for high-risk categories.
- Downgrade simple/read-only work only when evidence and lifecycle risk allow it.
- Route output must show cost class and downgrade reason.

## 12. Validation and Regression Plan

Required local commands:

```powershell
npm run typecheck
npm test
npm run build
node ./dist/packages/cli/src/main.js status --branch master --compact-json
node ./dist/packages/cli/src/main.js tasks inspect PHASE6.9-1 --branch master --json
node ./dist/packages/cli/src/main.js tasks route PHASE6.9-1 --branch master --json
node ./dist/packages/cli/src/main.js artifact validate <weak_fixture_run_id> artifacts/validation-T004.md --task T004 --agent validator --compact-json
node ./dist/packages/cli/src/main.js verify task PHASE6.9-4 --branch master --run <coverage_fixture_run_id>
node ./dist/packages/cli/src/main.js tasks route PHASE6.9-5 --branch master --json
node ./dist/packages/cli/src/main.js run inspect <ledger_fixture_run_id> --json
node ./dist/packages/cli/src/main.js verify task PHASE6.9-7 --branch master --run <applied_fixture_run_id>
node ./dist/packages/cli/src/main.js sync-back inspect <applied_fixture_run_id> --task PHASE6.9-7 --branch master --json
node ./dist/packages/cli/src/main.js doctor --latest-only --branch master
node ./dist/packages/cli/src/main.js status --branch master --profile
node ./dist/packages/cli/src/main.js tasks inspect PHASE6.9-9 --branch master --profile --json
node ./dist/packages/cli/src/main.js tasks route PHASE6.9-10 --branch master --json
node ./dist/packages/cli/src/main.js run index rebuild --json
npm pack --dry-run --json
```

Installed CLI regression:

- pack and install into an isolated npm prefix;
- run `sdd status`, `tasks inspect`, `tasks route`, `do task`, `verify task`, `sync-back inspect`, `doctor`, and run-index commands with `--branch master`;
- include EMP-style weak evidence, mention-only AC reference, generated validator template TODO mapping, missing command/material refs, explicit FAIL/BLOCKED override, applied re-verify, route mismatch, invocation ledger, material non-use, branch doctor, and cache invalidation cases;
- prove sync-back cannot apply weak PASS;
- uninstall the isolated CLI after validation.

## 13. Implementation Order

1. Register/rewrite Phase 6.9 docs and keep active docs aligned.
2. Add CER / PROV / attestation / policy trust contracts and fixtures.
3. Harden artifact evidence gate and ingestion.
4. Replace coverage with policy-backed acceptance classification.
5. Implement per-delegation route plans and execution normalization.
6. Add invocation ledger and material provenance rendering.
7. Enforce sync-back state machine and explicit-run semantics.
8. Add branch-scoped doctor trust suite.
9. Add profiling and content-addressed caches.
10. Add team-mode cost routing.
11. Run installed CLI and weak-evidence regression.

## 14. Gaps / Assumptions

- Host-level skill/tool invocation may not be fully observable in Phase 6.9; record only what SDD runtime can observe and do not invent entries.
- Policy rules must be deterministic and fixture-stable; if a rule depends on LLM judgment, the artifact is not eligible for PASS.
- Cache correctness depends on complete input hashing; unclear inputs must force recompute.
- Existing historic runs may lack ledger/provenance/attestation/policy fields; readers should normalize them as absent rather than fabricated.

## Phase Gate Checkpoint

- ready_for_tasks: `true`
- blockers: []
- required_user_decisions: []

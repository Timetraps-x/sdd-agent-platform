# Phase 6.9 Runtime Trust Layer and Fast Path Hardening

## 1. 定位

Phase 6.9 插入在 Phase 6.8 Project Document Language Runtime 与 Phase 7.0 Code Knowledge Graph Baseline 之间。它把真实 EMP 项目和当前仓库自测暴露的弱证据问题收束为 policy-proven Runtime Trust Layer：acceptance PASS 必须由 CER（Claim / Evidence / Reasoning）声明、PROV-style provenance facts、in-toto/SLSA-style evidence attestation 和 deterministic policy decision 共同证明。

本阶段不是最小化修补，也不是把命令合并成黑盒。它把 PASS 可信度、coverage 证据、delegation routing、agent execution provenance、material usage、sync-back state、doctor diagnostics、profiling、cache、team-mode cost routing 统一到可审计 contract 和 policy rules 中，避免 Phase 7.0 把不可信 run history 当作 code knowledge graph 输入。

AC id、复制的 acceptance 文本、artifact 自声明、模板 TODO 或 `Mentioned in artifacts/...` 只能成为 `REFERENCED_ONLY` 或 `MISSING`，不能成为 PASS。

## 2. 依赖

- depends_on: Phase 6.8 Project Document Language Runtime
- blocks: Phase 7.0 Code Knowledge Graph Baseline
- required_by: Phase 7.0

## 3. 核心问题

真实项目自测已经证明 SDD 能跑通端到端流程，但也暴露出结构性信任缺口：

- PASS 可以来自 artifact 自声明，而不是可审计 CER claim。
- Acceptance coverage 可以因为 `Mentioned in artifacts/...` 这种字符串命中而 PASS。
- AC id、复制的 acceptance 文本、模板 TODO 或泛泛的 PASS 语句缺少 source artifact、command/material refs 和 reasoning 时仍可能被误判为 evidence。
- reviewer / validator execution record 可以复用 implementer route policy，导致 `profile`、`toolPermission.profile`、`routeDecision.recommendedProfile` 不一致。
- agent / skill / material usage 缺少实际 invocation 账本，catalog presence 容易被误读成 used evidence。
- sync-back 在 applied 后 re-verify 可能重新进入 proposed。
- doctor 缺少明确 branch/partition context，容易检查错上下文。
- status / inspect / route / verify / doctor 等命令重复 parse、route、scan、validate，耗时可优化，但不能绕过 trust gate。

## 4. 范围

- Trust Contract Foundation：稳定定义 `EvidenceClaim`、`EvidenceItem`、`EvidenceReasoning`、`EvidenceCoverage`、`ProvenanceEntity`、`ProvenanceActivity`、`ProvenanceAgent`、`ProvenanceLink`、`SddEvidenceAttestation`、`PolicyRuleSet`、`PolicyDecision`、`DelegationRoutePlan`、`InvocationLedgerEntry`、`SyncBackProposal`、`DoctorTrustFinding`、`CommandProfile`、derived cache metadata。
- Evidence Quality Gate：PASS artifact 拒绝 TODO、空 evidence、模板原文、mention-only evidence、unsourced PASS、missing command output、missing material/artifact reference。
- Policy-backed Acceptance Coverage：AC 被提到不等于 PASS，coverage 必须由 CER claim、PROV facts、evidence attestation 和 deterministic policy decision 导出，并输出 `PASS`、`FAIL`、`BLOCKED`、`REFERENCED_ONLY`、`MISSING`。
- Artifact Ingestion Hardening：artifact ingestion 持久化 evidence quality issues，弱 PASS 不得进入 accepted successful evidence。
- Per-delegation Routing：每个 delegation 单独 route；router-rejected profile 不得生成 delegation。
- Agent Execution Normalization：`profile`、`toolPermission.profile`、route profile、model policy、route hash 必须一致，或显式记录 `policyReuse`。
- Invocation Ledger：追加记录 agent / skill / tool / material / policy decision / cache hit / cache miss 的实际 invocation，并作为 PROV activity/material 来源。
- Material Provenance：素材库未实际 invocation 时不得渲染为 material used。
- Sync-back State Machine：`not_created -> proposed -> applied` 单调推进，applied 后 re-verify 返回 already-applied/noop。
- Explicit Run Semantics：显式 `--run <missing>` 返回可行动错误，不暴露 raw ENOENT。
- Doctor Trust Suite：doctor 支持 branch/partition context，检查弱证据、mention-only PASS、policy/provenance/attestation gaps、route mismatch、profile mismatch、sync-back regression、material-without-invocation、stale/unsafe cache evidence。
- Command Profiling：为 project resolution、config load、document parse、task model build、route computation、run scan/index、evidence validation、policy evaluation、cache lookup、render 输出 opt-in phase timing。
- Content-addressed Fast Paths：只缓存 derived facts、provenance graph fragments 和 policy decisions，并由 runtime version、partition、config hash、document hashes、run/artifact hashes、router policy version、policy version、command options hash 失效。
- Team-mode Cost Routing：简单/只读任务可降级为 direct/compact/validator-only，高风险 API/schema/security/data/migration/broad blast-radius 任务保留 hyperplan/team-mode。

## 5. 非目标

- 不实现 Phase 7 code knowledge graph。
- 不引入 graph database、embedding store、daemon、remote worker fleet 或外部 telemetry 作为硬依赖。
- 不把命令隐藏、合并或改造成不可解释黑盒；命令保持清晰，优化每次命令内部重复工作。
- 不跳过 evidence gate、doctor trust checks、sync-back approval 或 artifact validation。
- 不把自然语言 artifact 自声明直接当作结构化事实。
- 不把素材库 catalog/source availability 当作 material usage evidence。
- 不使用 TTL-only cache 作为正确性边界。
- 不修改 Phase 6.8 的 docs_language 边界；runtime 仍默认英文。

## 6. 交付物

- Runtime trust contracts for CER claims, provenance facts, evidence attestations, policy rules, route plans, ledgers, sync-back, doctor findings, profiling, and cache metadata。
- Evidence quality gate and artifact ingestion issue persistence。
- Policy-backed acceptance coverage classifier and renderer。
- Per-delegation route plan and execution record normalization。
- Append-only invocation ledger and material provenance rendering。
- Sync-back monotonic state guard and explicit-run error handling。
- Branch-scoped doctor trust suite for evidence policy, provenance graph, attestation, ledger, routing, sync-back, and cache gaps。
- Command phase timing profile。
- Content-addressed derived cache for parse/task model/route/run-index/evidence/provenance/policy/doctor hot paths。
- Team-mode cost classifier for direct/compact/validator-only/implementation-review/hyperplan routing。
- EMP-style regression fixtures for weak evidence, mention-only coverage, generated template TODO coverage, route mismatch, applied re-verify, invocation provenance, cache invalidation, and cost routing。
- Full validation through typecheck, tests, build, package dry-run, installed CLI workflow, run-index, and doctor checks。

## 7. 验收标准

- Stable trust contracts exist for CER claims/reasoning, evidence items, coverage, PROV entities/activities/agents/links, evidence attestations, policy rules/decisions, delegation routes, invocation ledger, sync-back proposal, doctor findings, command profile, and cache metadata。
- TODO / empty / template / mention-only PASS artifact is rejected before ingestion, verify, and sync-back。
- Honest BLOCKED / FAIL artifacts preserve explicit blocker/failure evidence and override PASS-like references。
- Acceptance coverage never reports PASS solely as `Mentioned in artifacts/...`、AC id、复制的 acceptance 文本或 artifact 自声明。
- PASS coverage requires claim + evidence + reasoning + source artifact + command/material refs + passing policy decision。
- EMP T004-style weak validation does not become PASS coverage。
- Coverage output cites policy decision, evidence text, reasoning, provenance facts, attestation subject/materials, source artifact, commands/artifacts, and issue codes。
- reviewer/validator-only tasks do not create implementer delegations when router rejects implementer work。
- Each delegation has its own route plan; execution records have consistent profile/tool permission/route profile/model policy/route hash, or explicit policy reuse。
- Agent / skill / tool / material usage is auditable through invocation ledger entries; no invocation means no usage claim。
- Re-running verify after sync-back apply keeps sync-back applied or returns already-applied/noop instead of reverting to proposed。
- Doctor flags weak evidence, mention-only PASS coverage, policy/provenance/attestation gaps, route/delegation mismatch, profile/policy mismatch, sync-back regression, material-without-invocation, and stale/unsafe cache evidence for the specified branch。
- Command profiling reports major phase timing for hot paths。
- Content-addressed fast paths preserve correctness and invalidate on runtime/config/document/run/artifact/router/policy/options changes。
- Team-mode cost routing downgrades simple/read-only tasks while preserving high-risk hyperplan behavior。
- Full validation passes typecheck, tests, build, package dry-run, installed CLI workflow, run-index, doctor, and EMP-style regression fixtures。

## 8. Task Chain

- `PHASE6.9-1`: Stabilize runtime trust phase documents。
- `PHASE6.9-2`: Add CER / PROV / attestation / policy trust contracts and fixtures。
- `PHASE6.9-3`: Harden artifact evidence gate and ingestion。
- `PHASE6.9-4`: Replace acceptance coverage with policy-backed evidence classification。
- `PHASE6.9-5`: Route each delegation and normalize execution records。
- `PHASE6.9-6`: Add invocation ledger and material provenance。
- `PHASE6.9-7`: Enforce sync-back state machine and explicit run semantics。
- `PHASE6.9-8`: Add branch-scoped doctor trust suite。
- `PHASE6.9-9`: Add profiling and content-addressed fast paths。
- `PHASE6.9-10`: Add team-mode cost routing。
- `PHASE6.9-11`: Validate installed CLI and weak-evidence regressions。

## 9. 可被下游引用的产物

- `specs/master/phases/phase-6.9-runtime-trust-fast-path-hardening.md`
- `specs/master/phase6.9-spec.md`
- `specs/master/phase6.9-plan.md`
- `specs/master/phase6.9-tasks.md`
- `specs/master/phase6.9-validation.md`
- `.sdd/runs/<run_id>/invocations.jsonl`
- `.sdd/runs/<run_id>/agent-executions/*.json`
- `.sdd/runs/<run_id>/artifacts/acceptance-coverage-*.md`
- `.sdd/runs/<run_id>/artifacts/validation-*.md`

# Phase 1.3 Validation - Contract / Templates / Adapters Pack

## Contract Header

- phase: `1.3`
- phase artifact: `specs/master/phases/phase-1.3-contract-templates-adapters.md`
- status: `completed`
- validation type: static asset review

## Commands Run

No TypeScript/package validation command was required because Phase 1.3 changed only Markdown/YAML static assets and indexes, not JavaScript/TypeScript source, package config, dependencies, interfaces, or build scripts.

Manual/static review performed by inspecting the created asset paths and required identifiers.

## Static Asset Evidence

### Contract assets

- `schemas/contracts/project-yml-contract.md`
- `schemas/contracts/run-state-contract.md`
- `schemas/contracts/event-log-contract.md`
- `schemas/contracts/lifecycle-decision-contract.md`
- `schemas/contracts/sdd-task-contract.md`
- `schemas/contracts/sdd-result-contract.md`
- `schemas/contracts/delegation-liveness-contract.md`
- `schemas/contracts/doctor-static-assets-contract.md`

Evidence: each contract file contains contract id, version, owner, writer, reader, extension point guidance, and Phase 1.2 -> Phase 1.3 compatibility policy where applicable.

### Template assets

- `templates/spec-template.md`
- `templates/plan-template.md`
- `templates/tasks-template.md`
- `templates/project-template.yml`
- `templates/sync-back-proposal-template.md`

Evidence: each template contains a template id and version header. `tasks-template.md` includes `sdd-task`; `sync-back-proposal-template.md` includes proposal-only write-back boundaries.

### Adapter assets

- `adapters/generic.yml`
- `adapters/java-maven.yml`

Evidence: each adapter contains contract/version/id and declares project type, key directories, validation command slots, editing preference, runtime boundaries, lifecycle profiles, and risk confirmation hints. `generic.yml` keeps default commands empty/placeholders; `java-maven.yml` defaults to `mvn compile` and keeps `mvn test` optional.

## Compatibility / Migration Evidence

| Area | Canonical Phase 1.3 id/rule | Legacy Phase 1.2 acceptance | Static evidence |
|---|---|---|---|
| Project config | `sdd-project-yml-v1` for new `.sdd/project.yml` / templates | `phase-1.2-project-contract` accepted for existing `.sdd/project.yml` with `WARN` | `schemas/contracts/project-yml-contract.md`, `templates/project-template.yml` |
| Run state | `sdd-run-state-v1` for new snapshots | `phase-1.2-run-state-contract` accepted for existing runs with `WARN` | `schemas/contracts/run-state-contract.md` |
| Event log | `sdd-event-log-v1` for new JSONL records | `phase-1.2-event-log-contract` accepted for existing runs with `WARN`; old lines are not rewritten | `schemas/contracts/event-log-contract.md` |
| Lifecycle decision | `sdd-lifecycle-decision-v1` for new decisions | `phase-1.2-lifecycle-decision-contract` accepted as historical evidence with `WARN` | `schemas/contracts/lifecycle-decision-contract.md` |
| Doctor static assets | static asset pack must use canonical `sdd-*-v1`; legacy ids only accepted for existing project/run evidence | unknown ids `FAIL`; Phase 1.2 ids in new Phase 1.3 templates/static assets `FAIL` | `schemas/contracts/doctor-static-assets-contract.md` |

## Reserved Event Vocabulary Evidence

| Event family | Phase 1.3 static vocabulary | Scope |
|---|---|---|
| Gap | `gap_created`, `gap_detected`, `gap_classified`, `gap_resolution_proposed`, `gap_resolved`, `gap_deferred`, `gap_escalated` | reserved contract vocabulary only; no runtime implementation in Phase 1.3 |
| Delegation liveness/recovery | `delegation_started`, `delegation_completed`, `delegation_timeout`, `delegation_cancelled`, `delegation_stale`, `delegation_recovered` | aligned with liveness/recovery research vocabulary; no background manager implementation in Phase 1.3 |
| Artifact health | `artifact_missing`, `artifact_invalid` | reserved for future artifact validation/doctor phases |

## Artifact Path Canonicalization Evidence

| Context | Canonical form | Evidence |
|---|---|---|
| Runtime core helper input | artifact-root-relative, e.g. `review-T3.md` | `schemas/contracts/sdd-result-contract.md`, `schemas/contracts/delegation-liveness-contract.md` |
| Event/state/result references inside run records | run-relative, e.g. `artifacts/review-T3.md` | `schemas/contracts/run-state-contract.md`, `schemas/contracts/sdd-result-contract.md`, `schemas/contracts/delegation-liveness-contract.md` |
| Markdown/cross-document references outside the run | repo-relative, e.g. `.sdd/runs/<run_id>/artifacts/review-T3.md` | `templates/sync-back-proposal-template.md`, `schemas/contracts/doctor-static-assets-contract.md` |

## Static Review Checklist

- [PASS] Canonical Phase 1.3 IDs are documented as `sdd-*-v1` in static contracts/templates.
- [PASS] Phase 1.2 project/run/evidence IDs are documented as legacy accepted evidence with `WARN`, not auto-migrated in Phase 1.3.
- [PASS] Event log contract reserves stale/recovery/gap vocabulary required by downstream phases.
- [PASS] Artifact path forms are separated into artifact-root-relative, run-relative, and repo-relative scopes to avoid duplicate prefixing.
- [PASS] Generic adapter and project template are not Node-specific by default.
- [PASS] Java Maven adapter defaults to minimal compile and keeps test as optional.
## Acceptance Mapping

- [PASS] 每个 schema/template/adapter 都有版本头或 contract/template 标识。
- [PASS] templates 生成的新文档使用 Phase 1.3 canonical `sdd-*-v1` contract id。
- [PASS] Phase 1.2 runtime/evidence contract id 有明确兼容和迁移策略：existing evidence `WARN`/accept，unknown id `FAIL`，Phase 1.3 不自动改写历史记录。
- [PASS] `event-log-contract.md` 已保留 downstream 所需 gap/stale/recovery vocabulary，且明确不是 runtime 实现。
- [PASS] artifact path scope 已明确：helper input 用 artifact-root-relative，run records 用 run-relative，run 外 Markdown 用 repo-relative。
- [PASS] adapters 声明项目类型、默认验证命令槽和关键目录，但不执行验证；generic 默认不绑定 Node，Java Maven 默认 compile、test optional。
- [PASS] doctor 静态规则可检查资产存在性、版本、contract 标识、兼容性 WARN/FAIL 语义和 path canonicalization smell，且声明 no auto-fix。
- [PASS] 静态资产可作为后续 Phase 1.4/1.5/1.6/1.9/1.10 的稳定边界。

## Gaps

None.

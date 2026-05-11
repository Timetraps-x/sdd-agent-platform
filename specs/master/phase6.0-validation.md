# Phase 6.0 Validation

## Metadata

- phase_id: `6.0`
- validation_for: `Agent / Skill / Team Runtime Harness`
- status: `completed`

## Validation Matrix

| Check | Expected | Status | Evidence |
|---|---|---|---|
| Phase docs | Phase 6 artifact/spec/plan/tasks/validation exist and are restructured around agent/skill/team runtime | passed | `specs/master/phases/phase-6.0-agent-skill-runtime-harness.md`; `specs/master/phase6.0-{spec,plan,tasks,validation}.md` define the runtime harness scope. |
| Phase renumbering | Original code graph Phase 6 is now Phase 7 | passed | `specs/master/phases/phase-7.0-code-knowledge-graph-baseline.md`; phase indexes now place code graph after Phase 6 runtime metadata. |
| Reuse-first policy | Docs forbid rebuilding host/plugin/MCP/agent wheels without gap reason | passed | `artifacts/phase6.0-skill-reuse-catalog.md` records reuse/adapt/borrow/avoid decisions, source attribution, and build exception rules. |
| External material policy | External agent/skill repos are treated as material/mechanism sources, not SDD profile replacements | passed | Phase docs and `sdd external-packs inspect agency_agents_material` keep external material quarantined until source/license, scan, and mapping checks pass. |
| Anti big-prompt policy | Docs forbid bulk prompt copying and require structured metadata + short host projection | passed | Phase docs/catalog forbid prompt-pack bulk copy; external material is represented as capability metadata, risk ceiling, tool boundary, evidence schema, and quarantine checks. |
| Tool permission | ToolPermissionSpec covers tool groups, file scope, approval policy, allow/deny/ask, and runtime validation | passed | `sdd tasks route ONBOARDING-1 --branch master` prints tool permission profile, policy, groups, approval policy, and runtime constraints. |
| Router mechanism | `agent_fit`, `allowed_agents`, `risk`, `autonomy`, `required_artifacts`, capability source, tool permission, and team-mode activation are router inputs | passed | `sdd tasks route ONBOARDING-1 --branch master` returns `phase-6.0-agent-router-v1` with profile, capabilities, reuse decision, tool permission, autonomy ceiling, adaptive team-mode activation/mode/cost/reason, and next action. |
| Team-mode boundary | Team-mode is adaptive by default but bounded, supports `auto`/`force`/`off`, chief/member/team-message records, and cannot bypass SDD gates | passed | `sdd team-mode inspect` reports disabled no-task default; route/do paths show `activation=auto`, `--team-mode` maps to `force`, `--no-team-mode` maps to `off`, and selected modes remain bounded by SDD risk/artifact gates and evidence/provenance semantics. |
| Runtime evidence | AgentExecutionRecord, TeamSessionRecord, TeamMessageRecord, ExecutionTrajectory and EvidenceIngestionContract are defined as run artifacts/evidence inputs | passed | `sdd do task` router preflight, adaptive TeamSessionRecord `teamMode.activation/mode/costClass/reason`, `.sdd/runs/<run_id>/agent-executions/`, `.sdd/runs/<run_id>/team-sessions/`, `run inspect`, `status` latest_run_evidence, and doctor record-shape checks are implemented and covered by Phase 6 CLI/core tests. |
| Route health | SDD route has no gaps | passed | `sdd status --branch master` returned `gaps=0` and next task routing remained available. |

## Manual Validation Commands

```powershell
npm test
npm run build
npm run sdd -- agent-runtime validate
npm run sdd -- tasks route ONBOARDING-1 --branch master
npm run sdd -- tasks route ONBOARDING-1 --branch master --team-mode
npm run sdd -- tasks route ONBOARDING-1 --branch master --no-team-mode
npm run sdd -- external-packs inspect agency_agents_material
npm run sdd -- team-mode inspect
npm run sdd -- status --branch master
```

## Result

- status: `completed`
- notes: `P6.0-T1 through P6.0-T10 are implemented and validated. Evidence includes runtime contract/router/adaptive team-mode inspection, task execution router preflight, persisted agent/team execution records with activation/mode/cost reason, evidence ingestion visibility, npm test 127/127, npm run build, agent-runtime validate, adaptive task route smokes, and status smoke.`

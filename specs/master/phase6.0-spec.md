# Phase 6.0 Spec: Agent / Skill / Team Runtime Harness

## Metadata

- phase_id: `6.0`
- title: `Agent / Skill / Team Runtime Harness`
- source_artifact: `specs/master/phases/phase-6.0-agent-skill-runtime-harness.md`
- status: `planned`

## 1. Objective / Customer Value

Phase 6.0 must turn agent、skill、MCP、host tools、external agent packs and team-mode collaboration into an internal SDD mechanism. Users should be able to see why a task is routed to a profile/category/team wave, which existing host or open-source capability is reused, what autonomy and tool permission ceiling applies, what external material was borrowed or quarantined, and what evidence is required before verify/sync-back. Phase 6.1 extends this harness with resident worker claim/lease/heartbeat observability without changing Phase 6.0 routing authority.

## 2. Problem / Intent

Current Phase 5 outputs expose `agent_fit`, `allowed_agents`, `required_artifacts`, `autonomy`, risk, document-chain evidence and doctor/status visibility, but these fields are not yet a full runtime router. Research across Claude Code, OpenCode, Oh My OpenAgent/OpenCode, Roo/Cline, cc-sdd, agency-agents, wshobson agents, SuperClaude, Continue/OpenHands, Aider/SWE-agent, CrewAI/AutoGen/LangGraph and MCP catalogs shows that the strongest path is not replacing SDD agents with a larger prompt library. Phase 6.0 must borrow proven mechanisms while preserving SDD as source of truth.

The restructured Phase 6 treats GitHub agent/skill repositories as material libraries and mechanism references. SDD extracts structured metadata, guardrails, tool permissions, evidence patterns, team coordination, file ownership, quality gates and host projection rules. SDD does not bulk-copy prompts, does not become a prompt-driven OS, and does not delegate lifecycle truth to a host session.

## 3. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Define AgentProfileContract for planner/architect/implementer/reviewer/validator/researcher/orchestrator/security/domain_expert profiles and their allowed execution boundaries. | Must |
| FR-2 | Define SkillCapabilityContract for reusable skills, MCPs, host tools, browser/test/search/docs capabilities, domain expert material, and provenance. | Must |
| FR-3 | Define CapabilitySourceCatalog for Claude Code, OpenCode, Oh My, Roo/Cline, cc-sdd, agency-agents, wshobson, SuperClaude, Context7, Playwright, Aider/SWE-agent, Continue/OpenHands and MCP catalogs with reuse/adapt/borrow/avoid decisions. | Must |
| FR-4 | Define ExternalAgentPackImportPolicy that quarantines external prompt/agent packs and requires license/source attribution, hidden Unicode scan, secret scan, dangerous command scan and SDD frontmatter mapping before any routing use. | Must |
| FR-5 | Define ToolPermissionSpec that captures tool groups, file scopes, allow/deny/ask policy, approval policy and runtime validation records without rebuilding host permission systems. | Must |
| FR-6 | Define HostAdapterContract so Claude Code and future OpenCode/Cline/Roo-style hosts can execute without coupling core SDD logic to one runtime. | Must |
| FR-7 | Define AgentRouterContract that consumes task metadata, lifecycle risk gate, available host capabilities, external pack status, tool permission, team-mode activation and project config. | Must |
| FR-8 | Define TeamModePolicy for adaptive chief-agent/specialist-team selection, including activation (`auto`/`force`/`off`), selected mode (`off`/`review-lite`/`hyperplan`/`security-research`), cost class, team creation, member dispatch, team messages, tmux/host observability and blocked/finished semantics. | Must |
| FR-9 | Define DelegationWavePolicy for hyperplan/adversarial plan review, security-research, implementation/review/validation and other parallel waves with dependency, risk compatibility, file ownership and artifact isolation. | Must |
| FR-10 | Define AgentExecutionRecord, TeamSessionRecord and TeamMessageRecord stored under `.sdd/runs/<run_id>/agent-executions/` and `.sdd/runs/<run_id>/team-sessions/`. | Must |
| FR-11 | Define EvidenceIngestionContract that maps host agent/skill/team output into `sdd-result-v1` artifacts, implementation/review/validation artifacts, security findings, browser evidence, command evidence and verify-readable provenance. | Must |
| FR-12 | Define SkillReusePolicy that prioritizes existing open-source/native wheels and records build-vs-borrow decisions with source attribution and explicit gap reasons. | Must |
| FR-13 | Preserve SDD risk gate authority: router/team-mode output cannot downgrade hard gates, autonomy ceiling, required stages, required artifacts, tool permission or sync-back policy. | Must |

## 4. Non-functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-1 | Do not build a generic agent framework, plugin runtime, MCP hub, scheduler, multi-agent chat runtime or workflow OS when host/native/open-source capabilities can be reused. | Must |
| NFR-2 | Keep contracts host-neutral and adapter-friendly. | Must |
| NFR-3 | Keep user-facing output explainable: profile, category, team wave, reused capability, external source, risk reason, autonomy ceiling, tool permission and next action must be visible. | Must |
| NFR-4 | Preserve artifact and run evidence as source of truth; host sessions, tmux panes and subagent summaries are provenance, not canonical SDD state. | Must |
| NFR-5 | Avoid big-prompt engineering: external agent material must be mapped into structured metadata and short host projections, not bulk-inlined into core prompts. | Must |
| NFR-6 | Team-mode must not be globally forced: default activation is adaptive auto, low-risk routes stay off, `--team-mode` forces a bounded attempt, and `--no-team-mode` disables team usage for a route/run. | Must |
| NFR-7 | Security-research and PoC workflows must remain authorized, defensive and non-destructive, with severity calibrated by practical exploitability evidence. | Must |
| NFR-8 | Phase 6 must emit runtime metadata that Phase 6.1 resident workers and Phase 8 code graph can consume without implementing those layers early. | Must |

## 5. Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-1 | Phase 6 docs define agent profile, skill capability, capability source catalog, external pack import policy, tool permission, host adapter, router, team-mode, delegation wave, execution/team records, evidence ingestion and reuse policy contracts. | Document grep / review | Must |
| AC-2 | Phase 6 explicitly states open-source/native wheels are reused first and external agent repositories are material/mechanism sources, not SDD profile replacements. | Document review | Must |
| AC-3 | Anti-big-prompt rules forbid bulk-copying external prompt packs into SDD runtime and require structured metadata mapping. | Document review | Must |
| AC-4 | Original code graph phase is renumbered to Phase 8 and consumes Phase 6 agent/skill/team runtime metadata after Phase 7 core modularization. | Phase index review | Must |
| AC-5 | Router input/output semantics make `agent_fit`, `allowed_agents`, `risk`, `autonomy`, `required_artifacts`, tool permission and team-mode activation internal mechanism inputs. | Spec/plan/tasks review | Must |
| AC-6 | Team-mode is defined as adaptive-by-default but bounded, with `auto`/`force`/`off` activation, cost-capped modes, chief/member/team message records, and verify/doctor-readable evidence. | Spec/plan/tasks review | Must |
| AC-7 | Hyperplan and security-research are represented as SDD delegation waves, not unmanaged prompt flows. | Plan/tasks review | Must |
| AC-8 | `sdd status --branch master` reports no route gaps after documentation changes. | CLI smoke | Must |
| AC-9 | Phase 6 hands off to Phase 6.1 resident worker runtime for claim, lease, heartbeat, status, and inspect while preserving artifact/verify completion truth. | Phase 6.1 docs review | Must |

## 6. Out of Scope

- Implementing a full custom agent scheduler, workflow OS or multi-agent chat runtime.
- Rebuilding Claude Code, OpenCode, Cline/Roo, CrewAI, AutoGen or LangGraph runtime.
- Recreating MCP tools already available through host/project configuration.
- Bulk-importing external agent packs such as agency-agents, SuperClaude or wshobson agents without quarantine and mapping.
- Copying Oh My OpenAgent/OpenCode agent names/prompts/model configs directly.
- Forcing team-mode on every task by default; low-risk tasks must be allowed to remain `mode=off` under adaptive routing.
- Implementing Phase 8 code graph.
- Implementing Phase 6.1 resident worker claim/lease/heartbeat runtime; Phase 6.0 only defines the router/team metadata it consumes.

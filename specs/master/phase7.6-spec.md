# Phase 7.6 Spec — Agent Capability Upgrade

## Goal

Introduce an inspectable agent capability catalog that maps SDD command stages to bounded capability domains and routed material packs without turning the workflow into a global prompt OS.

## Functional requirements

### FR-1 Capability catalog

- Core must expose an `AgentCapabilityCatalog` through `@sdd-agent-platform/core/registries`.
- The catalog must include domains for norm discovery, uncertainty resolution, performance planning, verification design, evidence collection, sync-back risk review, release summary, and context curation.
- Each capability must declare stages, inputs, outputs, authority, routing metadata, and provenance.

### FR-2 Material routing policy

- Material packs must be declared separately from capability entries.
- Each material pack must declare trigger stages, trigger keywords, load policy, source id, and context budget.
- No command mapping may request `never_inline` as the active loading policy.

### FR-3 Command mappings

- The catalog must map `spec`, `plan`, `verifies`, `test`, `verify`, `sync-back`, and `ship` to required and optional capability domains.
- Command mappings must declare forbidden authority classes where validation runner behavior is not allowed.

### FR-4 Registry and doctor visibility

- Doctor must validate and report the Phase 7.6 catalog.
- CLI must expose text and JSON registry commands for listing and validating agent capabilities.
- Help text must advertise the new registry command.

### FR-5 Prompt-bloat and authority boundaries

- Capability/material metadata must remain compact and deterministic.
- Material packs must be routed by policy instead of globally injected.
- Advisory capabilities must not become workflow-affecting decisions without a downstream contract boundary.

## Non-goals

- Do not implement command-scoped team execution; Phase 7.7 owns that.
- Do not make all commands multi-agent by default.
- Do not import full external prompt libraries into runtime context.
- Do not change `/sdd:test` or `/sdd:verify` evidence semantics.

## Acceptance criteria

- AC-1: Core catalog validation passes and checks missing material/domain references.
- AC-2: The catalog covers the required domains and command mappings.
- AC-3: Doctor reports Phase 7.6 catalog visibility.
- AC-4: CLI exposes `sdd agent-capabilities list|validate` with text and JSON coverage.
- AC-5: Build, typecheck, full tests, package dry-run, CLI smokes, and doctor latest-only pass.

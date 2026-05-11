# Phase 6.3 Plan: Declarative Agent/Skill Capability Runtime

## Strategy

Implement one coherent runtime increment rather than multiple partial phases. The key invariant is that config parsing, registry inspection, routing, validation, CLI output, and tests must agree on the same merged runtime registry.

## Work tracks

### 1. Phase docs and chain

- Add Phase 6.3 phase artifact and execution docs.
- Update phase index/status.
- Update Phase 7.0 to consume Phase 6.3 registry evidence.

### 2. Project config contract

- Extend `ProjectConfig` with optional `agentRuntime`.
- Parse minimal `agent_runtime` YAML-like declarations using existing project config parser style.
- Keep existing projects valid when `agent_runtime` is omitted.

### 3. Merged registry

- Build a runtime registry from built-ins plus project config declarations.
- Preserve built-in baseline IDs.
- Reject duplicate project IDs in validation.
- Track origin/source metadata for profiles, capabilities, and sources.

### 4. Registry-backed routing

- Resolve task `allowed_agents` and `agent_fit` through registry and aliases.
- Match routing rules by task text and affected files.
- Select required capabilities from the chosen profile plus rule requirements plus existing contextual additions.
- Surface route explainability fields.

### 5. Quarantine and validation

- Extend source inspection to project-declared sources.
- Keep external sources quarantined unless mapped by validated contracts.
- Fail closed on unresolved aliases, profiles, capabilities, unsafe direct-execution requests, missing evidence types, and missing attribution.

### 6. CLI/tests/validation

- Extend existing CLI renderers instead of adding command sprawl.
- Add Phase 6.3 tests to `packages/core/src/index.test.ts`.
- Run focused and full validation.
- Record final evidence in `phase6.3-validation.md` and `PHASE_STATUS.md`.

## Risk controls

- Optional config only; no `agent_runtime` means old behavior.
- Additive JSON fields only.
- No prompt body fields in config.
- Built-in baseline remains mandatory.
- Project declarations cannot override built-ins in Phase 6.3.
- Router decisions must be inspectable and evidence-backed.

## Implementation order

1. Add docs and phase chain.
2. Add project config types/parser support.
3. Add merged registry builder and update inspection APIs.
4. Refactor router helpers to accept registry.
5. Add validation/quarantine checks.
6. Extend CLI renderers.
7. Add tests.
8. Run validation and update evidence.

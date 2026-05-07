# Lifecycle Decision Contract

## Header

- contract: `sdd-lifecycle-decision-v1`
- version: `1.3.0`
- phase: `1.3`
- canonical model: `docs/architecture/lifecycle-decision-model.md`
- storage: `state.json.lifecycleDecision`, `lifecycle_decision_recorded` event, optional artifact
- owner: `core/lifecycle-decision`
- writer: command gate/core decision evaluator in Phase 1.7+
- readers: CLI, doctor, command gate, validator, future graph

## Purpose

Records the shortest safe lifecycle path selected for a request. This contract stores the decision and evidence; Phase 1.3 does not implement routing logic.

## Contract ID Compatibility

- Canonical Phase 1.3 contract id: `sdd-lifecycle-decision-v1`. New lifecycle decision records must use this id.
- Legacy Phase 1.2 contract id accepted for existing runtime/evidence records: `phase-1.2-lifecycle-decision-contract`.
- Phase 1.3 readers/doctor/validation specs should accept legacy lifecycle decisions as historical evidence and emit `WARN` rather than failing when required decision fields are present.
- Migration rule: future decision writes use the canonical id; historical decision evidence is not rewritten in Phase 1.3.
- Unknown contract ids remain `FAIL` for compatibility checks.
## Required Shape

```yaml
lifecycle_decision:
  contract: sdd-lifecycle-decision-v1
  version: 1.3.0
  model_version: phase1.0-final
  input_summary:
    intent_clarity: high | medium | low
    acceptance_clarity: high | medium | low
    estimated_change_size: tiny | small | medium | large
    impact_surface: []
    impact_confidence: high | medium | low
    risk_tags: []
    validation_clarity: clear | partial | unclear
    orchestration_uncertainty: low | medium | high
    policy_hits: []
  decision:
    profile: direct | compact | full | research
    confidence: high | medium | low
    hard_gate_hits: []
    required_stages: []
    skipped_stages: []
    human_checkpoint_required: false
  reasons: []
  escalation_triggers: []
  downgrade_reason: null
  audit:
    decided_at: ISO-8601
    decided_by: command | runtime | user_override
    policy_version: phase1.0-final
    source_artifacts:
      - docs/architecture/lifecycle-decision-model.md
```

## Rules

- Hard gates and profiles must not diverge from the canonical model.
- `direct` is allowed only when the canonical direct whitelist is satisfied.
- Downgrades require a `downgrade_reason`.
- Missing or low-confidence signals must be recorded, not hidden.

## Extension Points

Add explanatory fields under `input_summary`, `decision`, or `audit`. Do not introduce new profile names without updating the canonical model.

---
template: sdd-init-onboarding-spec-v1
version: 1.3.0
contract: sdd-spec-doc-v1
sdd_managed_starter: true
---

# Spec: Project Onboarding

## Metadata

- spec_id: `onboarding`
- branch: `master`
- lifecycle_profile: `direct`
- source_request: `Created by sdd init`
- created_at: `2026-05-07T07:14:44.122Z`
- updated_at: `2026-05-07T07:14:44.122Z`

## Problem / Intent

This project has been initialized for SDD. Replace this onboarding spec with the first real feature or change request before implementation.

## Scope

### In Scope

- Confirm the project is initialized.
- Replace onboarding placeholders with a real spec, plan, and tasks when ready.

### Out of Scope

- Running background agents.
- Creating worktrees.
- Applying sync-back without explicit user approval.

## Requirements

### Functional Requirements

- FR-1: `sdd init` creates the SDD runtime config and starter semantic documents.
- FR-2: `sdd status --branch master` can inspect the initialized branch without missing document gaps.

### Non-functional Requirements

- NFR-1: Initialization must not overwrite user-authored SDD documents unless force is explicitly requested.

## Acceptance Criteria

- AC-1: `sdd status --branch master` reports all three semantic documents as present.
- AC-2: Existing user-authored semantic documents are preserved by default.

## Risks / Hard Gates

- Do not treat this onboarding scaffold as an approved implementation plan.

## Open Questions

- Replace this section with project-specific questions before implementation.

## Lifecycle Decision Reference

- decision_artifact: `pending`
- canonical_model: `docs/architecture/lifecycle-decision-model.md`

import assert from 'node:assert/strict';
import test from 'node:test';
import { CODING_FACT_SET_CONTRACT_VERSION, LIFECYCLE_RISK_DECISION_CONTRACT_VERSION, RUNTIME_PROJECTION_ENVELOPE_CONTRACT_VERSION } from './contracts.js';

test('Phase 8 contract constants are versioned', () => {
  assert.equal(CODING_FACT_SET_CONTRACT_VERSION, 'sdd-coding-fact-set-v1');
  assert.equal(LIFECYCLE_RISK_DECISION_CONTRACT_VERSION, 'sdd-lifecycle-risk-decision-v1');
  assert.equal(RUNTIME_PROJECTION_ENVELOPE_CONTRACT_VERSION, 'sdd-runtime-projection-envelope-v1');
});

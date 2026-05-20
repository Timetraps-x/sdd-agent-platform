import test from 'node:test';
import assert from 'node:assert/strict';

import { validTrustEvidence } from '../test-support/fixtures.js';
import { parseSddEvidenceMarkdown } from './sdd-evidence.js';

test('parseSddEvidenceMarkdown validates policy-backed acceptance evidence', () => {
  const report = parseSddEvidenceMarkdown(validTrustEvidence('T1', 'AC-1', 'artifacts/validation-T1.md'), {
    expectedTask: 'T1',
    sourceArtifact: 'artifacts/validation-T1.md'
  });

  assert.equal(report.valid, true);
  assert.equal(report.claims.length, 1);
  assert.equal(report.claims[0].acceptance, 'AC-1');
  assert.equal(report.claims[0].evidence[0].ref, 'npm test');
});

test('parseSddEvidenceMarkdown rejects task mismatch and derived source evidence', () => {
  const report = parseSddEvidenceMarkdown(`\n\`\`\`sdd-evidence\ncontract: sdd-evidence-v1\nversion: 1.0.0\ntask: T2\nacceptance: AC-1\nstatus: PASS\nclaim: Validation proves AC-1.\nsource_artifact: artifacts/acceptance-coverage-T1.md\nevidence_refs:\n  - artifact:artifacts/acceptance-coverage-T1.md\nprovenance_refs:\n  - artifact:artifacts/validation-T1.md\npolicy_refs:\n  - acceptance-policy-v1:require-source-evidence\n\`\`\`\n`, {
    expectedTask: 'T1',
    sourceArtifact: 'artifacts/validation-T1.md'
  });

  assert.equal(report.valid, false);
  assert.equal(report.issues.some((issue) => issue.message.includes('POLICY_RULE_FAILED')), true);
  assert.equal(report.issues.some((issue) => issue.message.includes('DERIVED_SOURCE_EVIDENCE')), true);
});

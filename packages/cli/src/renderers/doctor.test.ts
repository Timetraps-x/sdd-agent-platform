import test from 'node:test';
import assert from 'node:assert/strict';

import { renderDoctorReport } from './doctor.js';

test('doctor renderer summarizes checks with next action', () => {
  const rendered = renderDoctorReport({
    status: 'FAIL',
    checks: [
      { check: 'ai_entry', level: 'PASS', message: 'ok' },
      { check: 'ai_entry', level: 'FAIL', message: 'drift', action: 'run sdd init --force-ai' }
    ]
  });

  assert.match(rendered, /^SDD doctor/);
  assert.match(rendered, /checks pass=1 warn=0 fail=1/);
  assert.match(rendered, /\[FAIL\] ai_entry/);
  assert.match(rendered, /next\n- run sdd init --force-ai/);
});

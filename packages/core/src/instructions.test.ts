import test from 'node:test';
import assert from 'node:assert/strict';

import { getSddInstructions } from './instructions.js';

test('instructions API returns stable JSON contract payloads', () => {
  const initPayload = getSddInstructions('init');
  const doctorPayload = getSddInstructions('doctor');
  const overviewPayload = getSddInstructions('overview');
  const doPayload = getSddInstructions('do');
  const verifyPayload = getSddInstructions('verify');
  const planPayload = getSddInstructions('plan');
  const specPayload = getSddInstructions('spec');
  const tasksPayload = getSddInstructions('tasks');

  assert.equal(doctorPayload.contract, 'sdd-instructions-v1');
  assert.equal(doctorPayload.action, 'doctor');
  assert.equal(doctorPayload.requiredCommands.includes('sdd doctor --latest-only'), true);
  assert.equal(doctorPayload.forbiddenSideEffects.includes('background write'), true);
  assert.equal(overviewPayload.requiredCommands.includes('sdd verify task <task_id> [--branch <branch>] [--run <run_id>]'), true);
  assert.equal(overviewPayload.forbiddenSideEffects.includes('unapproved complex sync-back apply'), true);
  assert.match(overviewPayload.summary, /natural-language SDD intent/);
  assert.equal(overviewPayload.nextSteps.some((step) => /natural-language intent router/.test(step)), true);
  assert.equal(overviewPayload.nextSteps.some((step) => /ambiguous after status/.test(step)), true);
  assert.equal(initPayload.allowedSideEffects.includes('write managed generated AI entries'), true);
  assert.equal(initPayload.allowedSideEffects.includes('write specs/<branch>/spec.md'), false);
  assert.equal(initPayload.forbiddenSideEffects.some((item) => /legacy --scaffold-docs/.test(item)), true);
  assert.match(planPayload.summary, /deliverable technical solution document/);
  assert.equal(planPayload.nextSteps.some((step) => /PlantUML/.test(step)), true);
  assert.equal(planPayload.nextSteps.some((step) => /state-machine/.test(step) && /api_schema/.test(step)), true);
  assert.match(specPayload.summary, /workflow partition entry/);
  assert.equal(specPayload.forbiddenSideEffects.includes('design technical solution in spec.md'), true);
  assert.equal(specPayload.nextSteps.some((step) => /AC-1/.test(step) && /verification hints/.test(step)), true);
  assert.match(tasksPayload.summary, /executable evidence contract/);
  assert.equal(tasksPayload.forbiddenSideEffects.includes('turn tasks.md into project-management backlog'), true);
  assert.equal(tasksPayload.nextSteps.some((step) => /acceptance_refs/.test(step) && /plan_refs/.test(step)), true);
  assert.equal(doPayload.requiredCommands.includes('sdd artifact template artifacts/<agent>-<task_id>.md --task <task_id> --agent <agent>'), true);
  assert.equal(doPayload.forbiddenSideEffects.includes('mark missing evidence as PASS'), true);
  assert.equal(doPayload.nextSteps.some((step) => /artifacts\/implement-<task_id>\.md/.test(step)), true);
  assert.equal(verifyPayload.requiredCommands.includes('sdd artifact validate <run_id> <artifact> --task <task_id> --agent validator'), true);
  assert.equal(verifyPayload.forbiddenSideEffects.includes('unapproved complex sync-back apply'), true);
});

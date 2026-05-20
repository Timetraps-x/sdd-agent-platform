import { readFile } from 'node:fs/promises';
import { messageFromError } from '../../contracts/issues.js';
import { resolveSddContext } from '../../sdd-docs/context.js';
import { parseSddBranch, type SddTaskSourceLocation } from '../../sdd-docs/task-parser.js';
import { inspectVerifyContract } from '../../verification/verify-contract.js';
import { buildTaskRiskProfile } from '../../task-risk-profile.js';
import type { DoctorCheck } from '../model.js';

export async function inspectDocumentChainEvidence(projectRoot: string, branch?: string | null): Promise<DoctorCheck[]> {
  try {
    const context = await resolveSddContext(projectRoot, branch ? { branch, branchSource: 'cli_option' } : {});
    const model = await parseSddBranch(projectRoot, context.branch);
    if (!model.documents.specExists || !model.documents.tasksExists) {
      return [{
        level: 'WARN',
        check: 'document_chain',
        message: `Document chain skipped for ${context.branch}; spec.md or tasks.md is missing.`,
        action: 'Create specs/<branch>/spec.md and tasks.md before document-chain verification.'
      }];
    }

    const checks: DoctorCheck[] = [];
    const specRaw = await readFile(model.specPath, 'utf8');
    const specAcceptanceIds = extractSpecAcceptanceIds(specRaw);
    if (specAcceptanceIds.size === 0) {
      checks.push({
        level: 'WARN',
        check: 'document_chain_spec_acceptance',
        message: `No AC-* acceptance IDs found in ${sourceLocationEvidence({ filePath: model.specPath, heading: null, lineStart: 1, lineEnd: 1 })}.`,
        action: 'Add stable acceptance IDs such as AC-1 in spec.md.'
      });
    }

    for (const task of model.tasks) {
      for (const ref of task.acceptanceRefs) {
        if (!specAcceptanceIds.has(ref)) {
          checks.push({
            level: 'FAIL',
            check: 'document_chain_acceptance_ref',
            message: `Task ${task.id} references missing spec acceptance ${ref}.`,
            action: 'Fix acceptance_refs or add the referenced AC ID to spec.md.'
          });
        }
      }

      if (isHighRiskTask(task)) {
        if (task.requiredArtifacts.length === 0) {
          checks.push({
            level: 'FAIL',
            check: 'document_chain_high_risk_evidence',
            message: `High-risk task ${task.id} has no required_artifacts.`,
            action: 'Declare reviewer and validator artifacts before high-risk execution.'
          });
        }
        if (!task.requiredArtifacts.some((artifact) => /review/i.test(artifact)) || !task.requiredArtifacts.some((artifact) => /validation|validator/i.test(artifact))) {
          checks.push({
            level: 'WARN',
            check: 'document_chain_high_risk_evidence',
            message: `High-risk task ${task.id} should require explicit reviewer and validator evidence artifacts.`,
            action: 'Add artifacts/review-<task>.md and artifacts/validation-<task>.md or equivalent evidence paths.'
          });
        }
        if (task.verificationAvailability.length === 0) {
          checks.push({
            level: 'WARN',
            check: 'document_chain_high_risk_verification',
            message: `High-risk task ${task.id} has no verification_availability.`,
            action: 'Declare available unit/build/inspect/manual verification before high-risk execution.'
          });
        }
      }
    }

    const verifyInspection = await inspectVerifyContract(projectRoot, branch ? { branch, branchSource: 'cli_option' } : {});
    for (const issue of verifyInspection.issues) {
      checks.push({
        level: issue.level === 'FAIL' ? 'FAIL' : 'WARN',
        check: issue.field === 'verify.md' ? 'document_chain_verify_missing' : 'document_chain_verify_contract',
        message: issue.message,
        action: issue.action
      });
    }

    if (checks.length === 0) {
      checks.push({
        level: 'PASS',
        check: 'document_chain',
        message: `Spec acceptance IDs, task evidence links, and verify.md contract are consistent for ${context.branch}.`
      });
    }
    return checks;
  } catch (error) {
    return [{
      level: 'WARN',
      check: 'document_chain',
      message: `Document chain could not be inspected: ${messageFromError(error)}`,
      action: 'Run sdd tasks gaps, sdd verifies inspect, and inspect specs/<branch>/spec.md/tasks.md manually.'
    }];
  }
}

function extractSpecAcceptanceIds(raw: string): Set<string> {
  return new Set(Array.from(raw.matchAll(/\bAC-[A-Za-z0-9._-]+\b/g)).map((match) => match[0]));
}

function isHighRiskTask(task: Parameters<typeof buildTaskRiskProfile>[0]): boolean {
  return buildTaskRiskProfile(task).riskLevel === 'high';
}

function sourceLocationEvidence(source: SddTaskSourceLocation): string {
  return `${source.filePath}:${source.lineStart}-${source.lineEnd}`;
}

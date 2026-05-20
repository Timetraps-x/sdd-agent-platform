import type { ArtifactResultIngestionInspection, ArtifactResultIngestionResult } from '@sdd-agent-platform/core/artifacts';
import type { validateSddResultArtifact } from '@sdd-agent-platform/core/artifacts';
import { renderIssues } from './issues.js';

export function renderArtifactIngestionResult(result: ArtifactResultIngestionResult): string {
  const lines = [`Artifact ingestion ${result.record.status}: ${result.record.artifactPath}`];
  lines.push(`delegation=${result.record.delegationId} duplicate=${result.duplicate} result=${result.record.resultStatus ?? 'n/a'} terminal=${result.record.delegationStatus ?? 'n/a'}`);
  if (result.record.issues.length > 0) {
    lines.push('issues');
    for (const issue of result.record.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
      lines.push(`  recommendation: ${issue.recommendation}`);
    }
  }
  if (result.record.gaps.length > 0) {
    lines.push('gaps');
    for (const gap of result.record.gaps) {
      lines.push(`- [${gap.severity}] ${gap.type} ${gap.field}: ${gap.message}`);
    }
  }
  return lines.join('\n');
}

export function renderArtifactIngestionInspection(inspection: ArtifactResultIngestionInspection): string {
  const lines = [`Artifact ingestions ${inspection.valid ? 'valid' : 'invalid'} for ${inspection.runId}`];
  lines.push(`records=${inspection.records.length}`);
  for (const record of inspection.records) {
    lines.push(`- ${record.delegationId} ${record.status} artifact=${record.artifactPath} result=${record.resultStatus ?? 'n/a'} delegation=${record.delegationStatus ?? 'n/a'}`);
  }
  renderIssues(lines, inspection.issues);
  return lines.join('\n');
}

export function renderArtifactValidationReport(artifactPath: string, report: Awaited<ReturnType<typeof validateSddResultArtifact>>, expectedTask?: string, expectedAgent?: string): string {
  if (report.valid) {
    return `Artifact valid: ${artifactPath}`;
  }
  const lines = [`Artifact invalid: ${artifactPath}`];
  for (const issue of report.issues) {
    lines.push(`- ${issue.field}: ${issue.message}`);
    lines.push(`  recommendation: ${issue.recommendation}`);
  }
  if (expectedTask && expectedAgent) {
    lines.push(`next sdd artifact template ${artifactPath} --task ${expectedTask} --agent ${expectedAgent}`);
  }
  return lines.join('\n');
}

import type { LifecycleRiskGateExtraction } from '@sdd-agent-platform/core/lifecycle';

export function renderLifecycleRiskExtraction(extraction: LifecycleRiskGateExtraction | null): string {
  if (!extraction) {
    return '';
  }
  const lines = [
    'Lifecycle Risk Gate',
    'changed',
    '- deterministic risk signals extracted',
    'decision',
    `- source=${extraction.source}`,
    `- risk_tags=${extraction.riskTags.join(',') || 'none'}`,
    `- affected_contracts=${extraction.affectedContracts.join(',') || 'none'}`,
    `- external_unknown=${extraction.externalUnknown}`,
    'evidence'
  ];
  if (extraction.evidence.length === 0) {
    lines.push('- none');
  } else {
    for (const item of extraction.evidence) {
      lines.push(`- ${item.category}: ${item.matched} -> ${item.riskTag}`);
    }
  }
  lines.push('gaps');
  lines.push('- none');
  lines.push('next');
  lines.push('- Evaluate extracted signals with lifecycle decision gate.');
  return `${lines.join('\n')}\n`;
}

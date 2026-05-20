import { COMMAND_OUTPUT_SUMMARY_CONTRACT_VERSION } from '../contracts.js';
import type { ContextProfile } from './budget.js';
import type { ContextSourceRef } from './source-refs.js';

export type ContextSummaryStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'UNKNOWN';

export interface CommandOutputSummary {
  contract: typeof COMMAND_OUTPUT_SUMMARY_CONTRACT_VERSION;
  authoritative: false;
  usableForPass: false;
  source: ContextSourceRef;
  status: ContextSummaryStatus;
  highlights: string[];
  omittedLines: number;
}

export function summarizeCommandOutput(rawOutput: string, source: ContextSourceRef, profile: ContextProfile = 'brief'): CommandOutputSummary {
  const lines = rawOutput.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const failureLines = lines.filter((line) => /\b(fail(?:ed|ure)?|error|blocked|exception|traceback|timed out|timeout)\b/i.test(line));
  const successLines = lines.filter((line) => /\b(pass(?:ed)?|success|completed|ok)\b/i.test(line));
  let maxHighlights = 5;
  if (profile === 'normal') {
    maxHighlights = 12;
  } else if (profile === 'forensic') {
    maxHighlights = lines.length;
  }
  const selected = [...failureLines, ...successLines, ...lines].filter((line, index, all) => all.indexOf(line) === index).slice(0, maxHighlights);
  let status: ContextSummaryStatus = 'UNKNOWN';
  if (failureLines.some((line) => /\bblocked\b/i.test(line))) {
    status = 'BLOCKED';
  } else if (failureLines.length > 0) {
    status = 'FAIL';
  } else if (successLines.length > 0) {
    status = 'PASS';
  }
  return {
    contract: COMMAND_OUTPUT_SUMMARY_CONTRACT_VERSION,
    authoritative: false,
    usableForPass: false,
    source,
    status,
    highlights: selected,
    omittedLines: Math.max(0, lines.length - selected.length)
  };
}

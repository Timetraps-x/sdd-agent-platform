import { CONTEXT_BUDGET_CONTRACT_VERSION } from '../contracts.js';

export type ContextProfile = 'brief' | 'normal' | 'forensic';

export interface ContextBudget {
  contract: typeof CONTEXT_BUDGET_CONTRACT_VERSION;
  profile: ContextProfile;
  maxBytes: number;
  preserve: string[];
}

export function parseContextProfile(value: string | null | undefined): ContextProfile {
  if (!value || value === 'brief') {
    return 'brief';
  }
  if (value === 'normal' || value === 'forensic') {
    return value;
  }
  throw new Error(`Unsupported context profile: ${value}`);
}

export function contextBudgetForProfile(profile: ContextProfile): ContextBudget {
  if (profile === 'forensic') {
    return { contract: CONTEXT_BUDGET_CONTRACT_VERSION, profile, maxBytes: 64 * 1024, preserve: ['blockers', 'failures', 'source_refs', 'complete_evidence'] };
  }
  if (profile === 'normal') {
    return { contract: CONTEXT_BUDGET_CONTRACT_VERSION, profile, maxBytes: 12 * 1024, preserve: ['blockers', 'failures', 'source_refs', 'next_action'] };
  }
  return { contract: CONTEXT_BUDGET_CONTRACT_VERSION, profile, maxBytes: 2 * 1024, preserve: ['blockers', 'current_task', 'next_action', 'source_refs'] };
}

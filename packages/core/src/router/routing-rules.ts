import type { SddTask } from '../sdd-docs/task-parser.js';
import type { AgentRuntimeRoutingRule } from './agent-runtime.js';
import type { AgentSkillRuntimeRegistry } from './runtime-registry.js';

export function matchRoutingRules(task: SddTask, registry: AgentSkillRuntimeRegistry): AgentRuntimeRoutingRule[] {
  return registry.routingRules.filter((rule) => taskMatchesRoutingRule(task, rule));
}

function taskMatchesRoutingRule(task: SddTask, rule: AgentRuntimeRoutingRule): boolean {
  const text = taskSearchText(task);
  const keywordMatched = rule.when.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  const fileMatched = rule.when.affectedFileGlobs.some((glob) => task.affectedFiles.some((filePath) => globMatchesPath(glob, filePath)));
  return keywordMatched || fileMatched;
}

function taskSearchText(task: SddTask): string {
  const metadataValues: string[] = [];
  for (const value of Object.values(task.rawMetadata)) {
    if (Array.isArray(value)) {
      metadataValues.push(...value);
    } else {
      metadataValues.push(value);
    }
  }
  return [
    task.id,
    task.title ?? '',
    task.boundary ?? '',
    task.implementationNotes ?? '',
    ...task.risk,
    ...task.validation,
    ...task.acceptance,
    ...task.acceptanceRefs,
    ...task.planRefs,
    ...task.fileOwnership,
    ...task.agentFit,
    ...task.allowedAgents,
    ...task.requiredArtifacts,
    ...metadataValues
  ].join('\n').toLowerCase();
}

function globMatchesPath(glob: string, filePath: string): boolean {
  return new RegExp(globToRegExpPattern(glob.replace(/\\/g, '/'))).test(filePath.replace(/\\/g, '/'));
}

function globToRegExpPattern(glob: string): string {
  let pattern = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];
    if (char === '*' && next === '*') {
      if (glob[index + 2] === '/') {
        pattern += '(?:.*/)?';
        index += 2;
      } else {
        pattern += '.*';
        index += 1;
      }
      continue;
    }
    if (char === '*') {
      pattern += '[^/]*';
      continue;
    }
    if (char === '?') {
      pattern += '[^/]';
      continue;
    }
    pattern += /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
  }
  return `${pattern}$`;
}

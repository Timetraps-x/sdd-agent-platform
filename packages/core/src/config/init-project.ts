import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { applyAiToolEntries, type AiProjectionResult, type AiToolSelection } from '../ai-tools.js';
import { getProjectConfigPath, getRunsDir, getSddDir } from '../runtime-paths.js';
import { detectProjectConfig, readProjectConfig, renderProjectConfig } from './project-config.js';
import { assertSafePathSegment } from '../path-safety.js';
import { exists } from '../storage/json-io.js';
import { renderInitPlanDocument, renderInitSpecDocument, renderInitTasksDocument } from './starter-documents.js';

export type InitDocumentStatus = 'created' | 'unchanged' | 'overwritten' | 'skipped';

export interface InitDocumentReport {
  branch: string;
  relativePath: string;
  status: InitDocumentStatus;
  message: string;
}

export interface InitDocumentsResult {
  branch: string;
  root: string;
  documents: InitDocumentReport[];
}

export interface InitProjectResult {
  configPath: string;
  created: boolean;
  documents: InitDocumentsResult;
  aiTools: AiProjectionResult[];
}

export async function applyInitDocuments(projectRoot: string, options: { branch: string; force?: boolean; scaffoldDocuments: boolean; docsLanguage: string }): Promise<InitDocumentsResult> {
  assertSafePathSegment(options.branch, 'branch');
  const docsRoot = path.join(projectRoot, 'specs', options.branch);
  const now = new Date().toISOString();
  const documents = [
    { name: 'spec.md', content: renderInitSpecDocument(options.branch, now, options.docsLanguage) },
    { name: 'plan.md', content: renderInitPlanDocument(options.branch, now, options.docsLanguage) },
    { name: 'tasks.md', content: renderInitTasksDocument(options.branch, now, options.docsLanguage) }
  ];

  if (!options.scaffoldDocuments) {
    return {
      branch: options.branch,
      root: path.relative(projectRoot, docsRoot),
      documents: documents.map((document) => ({
        branch: options.branch,
        relativePath: `specs/${options.branch}/${document.name}`,
        status: 'skipped',
        message: 'Starter semantic document scaffold skipped.'
      }))
    };
  }

  await mkdir(docsRoot, { recursive: true });
  const reports: InitDocumentReport[] = [];
  for (const document of documents) {
    const absolutePath = path.join(docsRoot, document.name);
    const relativePath = `specs/${options.branch}/${document.name}`;
    const existed = await exists(absolutePath);
    if (existed && !options.force) {
      reports.push({
        branch: options.branch,
        relativePath,
        status: 'unchanged',
        message: 'Existing semantic document preserved.'
      });
      continue;
    }

    await writeFile(absolutePath, document.content, 'utf8');
    reports.push({
      branch: options.branch,
      relativePath,
      status: existed ? 'overwritten' : 'created',
      message: existed ? 'Starter semantic document overwritten by explicit force.' : 'Starter semantic document created.'
    });
  }

  return { branch: options.branch, root: path.relative(projectRoot, docsRoot), documents: reports };
}

export async function initProject(projectRoot: string, options: { force?: boolean; aiTool?: AiToolSelection; branch?: string; scaffoldDocuments?: boolean } = {}): Promise<InitProjectResult> {
  const sddDir = getSddDir(projectRoot);
  const runsDir = getRunsDir(projectRoot);
  const configPath = getProjectConfigPath(projectRoot);
  const requestedBranch = options.branch?.trim();
  const scaffoldDocuments = options.scaffoldDocuments ?? true;
  const branch = requestedBranch || 'master';
  assertSafePathSegment(branch, 'branch');
  await mkdir(runsDir, { recursive: true });

  let created = false;
  let projectConfig = null;
  if (options.force || !await exists(configPath)) {
    const projectName = path.basename(path.resolve(projectRoot));
    const config = await detectProjectConfig(projectRoot, projectName);
    config.sdd.default_branch = requestedBranch || (scaffoldDocuments ? branch : undefined);
    await writeFile(configPath, renderProjectConfig(config), 'utf8');
    projectConfig = config;
    created = true;
  }

  if (!projectConfig) {
    projectConfig = await readProjectConfig(projectRoot);
  }

  const documents = await applyInitDocuments(projectRoot, {
    branch,
    force: options.force,
    scaffoldDocuments,
    docsLanguage: projectConfig.sdd.docs_language
  });

  await mkdir(sddDir, { recursive: true });
  const aiTools = await applyAiToolEntries(projectRoot, { tool: options.aiTool ?? 'auto' });
  return { configPath, created, documents, aiTools };
}

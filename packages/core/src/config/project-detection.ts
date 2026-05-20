import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export type DetectionConfidence = 'high' | 'medium' | 'low';

export interface DetectionEvidence {
  kind: string;
  detail: string;
  weight: number;
}

export interface ProjectDetectionCandidate {
  id: string;
  language: string;
  framework: string;
  score: number;
  confidence: DetectionConfidence;
  evidence: DetectionEvidence[];
  validationDefault: string[];
}

export interface ProjectDetection {
  primary: ProjectDetectionCandidate;
  candidates: ProjectDetectionCandidate[];
  mixed_stack: boolean;
}

interface ProjectDetector {
  id: string;
  detect(projectRoot: string, rootEntries: string[]): Promise<ProjectDetectionCandidate>;
}

const PROJECT_DETECTORS: ProjectDetector[] = [
  {
    id: 'java-ssm-maven-multimodule',
    async detect(projectRoot, rootEntries) {
      const hasPom = rootEntries.includes('pom.xml');
      const pom = hasPom ? await readFile(path.join(projectRoot, 'pom.xml'), 'utf8') : '';
      const javaFiles = await countFiles(projectRoot, (filePath) => filePath.endsWith('.java'), 100);
      const springXmlFiles = await countFiles(projectRoot, (filePath) => filePath.endsWith('.xml') && filePath.includes('/src/main/') && /applicationContext|spring|dubbo|mybatis/i.test(path.basename(filePath)), 50);
      const mybatisMapperFiles = await countFiles(projectRoot, (filePath) => filePath.endsWith('Mapper.xml'), 50);
      const mavenMultimodule = /<packaging>\s*pom\s*<\/packaging>/i.test(pom) || /<modules>\s*<module>/is.test(pom);
      const ssmScore = springXmlFiles + mybatisMapperFiles + (/spring|mybatis|dubbo/i.test(pom) ? 3 : 0);
      const evidence = detectionEvidence([
        { kind: 'pom.xml', detail: hasPom ? 'root pom.xml present' : '', weight: hasPom ? 6 : 0 },
        { kind: 'maven_multimodule', detail: mavenMultimodule ? 'packaging pom or modules detected' : '', weight: mavenMultimodule ? 3 : 0 },
        { kind: 'java_sources', detail: `${javaFiles} Java source file(s)`, weight: Math.min(javaFiles, 10) },
        { kind: 'ssm_evidence', detail: `${ssmScore} Spring/MyBatis evidence point(s)`, weight: Math.min(ssmScore, 10) }
      ]);
      return detectionCandidate('java-ssm-maven-multimodule', 'java', mavenMultimodule || ssmScore > 0 ? 'ssm-maven-multimodule' : 'maven', evidence, ['mvn compile']);
    }
  },
  {
    id: 'typescript-node',
    async detect(projectRoot, rootEntries) {
      const hasPackageJson = rootEntries.includes('package.json');
      const packageJson = hasPackageJson ? await readFile(path.join(projectRoot, 'package.json'), 'utf8') : '';
      const tsFiles = await countFiles(projectRoot, (filePath) => filePath.endsWith('.ts') || filePath.endsWith('.tsx'), 100);
      const nodeSourceDirs = rootEntries.filter((entry) => ['src', 'app', 'pages'].includes(entry)).length;
      const typescriptEvidence = /typescript|tsx|ts-node|vite|next|nuxt/i.test(packageJson);
      const evidence = detectionEvidence([
        { kind: 'package.json', detail: hasPackageJson ? 'root package.json present' : '', weight: hasPackageJson ? 4 : 0 },
        { kind: 'typescript_sources', detail: `${tsFiles} TypeScript source file(s)`, weight: Math.min(tsFiles, 10) },
        { kind: 'typescript_package', detail: typescriptEvidence ? 'TypeScript-related package metadata detected' : '', weight: typescriptEvidence ? 3 : 0 },
        { kind: 'node_source_dirs', detail: `${nodeSourceDirs} common Node source dir(s)`, weight: nodeSourceDirs }
      ]);
      return detectionCandidate('typescript-node', 'typescript', typescriptEvidence || tsFiles > 0 ? 'typescript-node' : 'node', evidence, ['npm run typecheck']);
    }
  }
];

export async function detectProject(projectRoot: string): Promise<ProjectDetection> {
  const rootEntries = await safeReadDir(projectRoot);
  const detected = await Promise.all(PROJECT_DETECTORS.map((detector) => detector.detect(projectRoot, rootEntries)));
  const candidates = detected.filter((candidate) => candidate.score > 0).sort((left, right) => right.score - left.score);
  const primary = candidates[0] ?? detectionCandidate('typescript-node', 'typescript', 'node', [], ['npm run typecheck']);
  return {
    primary,
    candidates: candidates.length > 0 ? candidates : [primary],
    mixed_stack: candidates.length > 1
  };
}

function detectionEvidence(items: DetectionEvidence[]): DetectionEvidence[] {
  return items.filter((item) => item.weight > 0);
}

function detectionCandidate(id: string, language: string, framework: string, evidence: DetectionEvidence[], validationDefault: string[]): ProjectDetectionCandidate {
  const score = evidence.reduce((total, item) => total + item.weight, 0);
  return {
    id,
    language,
    framework,
    score,
    confidence: detectionConfidence(score),
    evidence,
    validationDefault
  };
}

function detectionConfidence(score: number): DetectionConfidence {
  if (score >= 10) {
    return 'high';
  }
  if (score >= 5) {
    return 'medium';
  }
  return 'low';
}

async function safeReadDir(directory: string): Promise<string[]> {
  try {
    return await readdir(directory);
  } catch {
    return [];
  }
}

async function countFiles(root: string, predicate: (filePath: string) => boolean, limit: number): Promise<number> {
  let count = 0;
  const pending = [root];

  while (pending.length > 0 && count < limit) {
    const current = pending.pop() as string;
    for (const entry of await safeReadDir(current)) {
      if (['.git', 'node_modules', 'target', 'dist', '.sdd'].includes(entry)) {
        continue;
      }

      const fullPath = path.join(current, entry);
      const entryStat = await stat(fullPath).catch(() => null);
      if (!entryStat) {
        continue;
      }
      if (entryStat.isDirectory()) {
        pending.push(fullPath);
      } else if (predicate(fullPath.replace(/\\/g, '/'))) {
        count += 1;
        if (count >= limit) {
          return count;
        }
      }
    }
  }

  return count;
}

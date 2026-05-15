import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const CLI_SRC = path.join(PROJECT_ROOT, 'packages', 'cli', 'src');
const CORE_SRC = path.join(PROJECT_ROOT, 'packages', 'core', 'src');
const CORE_DIST = path.join(PROJECT_ROOT, 'packages', 'core', 'dist');
const CORE_PACKAGE_JSON = path.join(PROJECT_ROOT, 'packages', 'core', 'package.json');
const ROOT_PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');

interface CoreExportTarget {
  types: string;
  import: string;
}

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith('.ts') ? [fullPath] : [];
  }));
  return files.flat();
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

test('CLI imports core only through package subpath exports', async () => {
  const files = await collectTypeScriptFiles(CLI_SRC);
  const violations: string[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const relativePath = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
    if (/from\s+['"](?:\.\.\/){2,3}core\/src\//.test(content)) {
      violations.push(`${relativePath}: relative core/src import`);
    }
    if (/from\s+['"]@sdd-agent-platform\/core['"]/.test(content)) {
      violations.push(`${relativePath}: root core package import`);
    }
  }

  assert.deepEqual(violations, []);
});

test('core package exports only stable source facades with built dist targets', async () => {
  const corePackage = await readJsonFile<{ exports: Record<string, CoreExportTarget> }>(CORE_PACKAGE_JSON);
  const violations: string[] = [];

  for (const [subpath, target] of Object.entries(corePackage.exports)) {
    if (subpath === '.') {
      violations.push('root package export is not allowed');
      continue;
    }
    if (!subpath.startsWith('./')) {
      violations.push(`${subpath}: export subpath must start with ./`);
      continue;
    }

    const facadeName = subpath.slice(2);
    const expectedTypes = `./dist/${facadeName}.d.ts`;
    const expectedImport = `./dist/${facadeName}.js`;
    if (target.types !== expectedTypes) {
      violations.push(`${subpath}: expected types target ${expectedTypes}, got ${target.types}`);
    }
    if (target.import !== expectedImport) {
      violations.push(`${subpath}: expected import target ${expectedImport}, got ${target.import}`);
    }
    if (!(await pathExists(path.join(CORE_SRC, `${facadeName}.ts`)))) {
      violations.push(`${subpath}: missing source facade packages/core/src/${facadeName}.ts`);
    }
    if (!(await pathExists(path.join(CORE_DIST, `${facadeName}.js`)))) {
      violations.push(`${subpath}: missing built import target packages/core/dist/${facadeName}.js`);
    }
    if (!(await pathExists(path.join(CORE_DIST, `${facadeName}.d.ts`)))) {
      violations.push(`${subpath}: missing built types target packages/core/dist/${facadeName}.d.ts`);
    }
  }

  assert.deepEqual(violations, []);
});

test('root package publishes package-local CLI and core build outputs', async () => {
  const rootPackage = await readJsonFile<{ bin: Record<string, string>; files: string[] }>(ROOT_PACKAGE_JSON);

  assert.equal(rootPackage.bin.sdd, 'packages/cli/dist/main.js');
  assert.ok(rootPackage.files.includes('packages/cli/dist'));
  assert.ok(rootPackage.files.includes('packages/cli/package.json'));
  assert.ok(rootPackage.files.includes('packages/core/dist'));
  assert.ok(rootPackage.files.includes('packages/core/package.json'));
});
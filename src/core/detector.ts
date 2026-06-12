import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfig } from '../types';

export function detectPackageManager(cwd: string): ProjectConfig['packageManager'] {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

export function detectFramework(deps: Record<string, string>): ProjectConfig['framework'] {
  if (deps['next']) return 'nextjs';
  if (deps['express'] && deps['vue']) return 'express-vue';
  if (deps['express'] && deps['react']) return 'express-react';
  return 'unknown';
}

export function detectOrm(deps: Record<string, string>): ProjectConfig['orm'] {
  if (deps['@prisma/client'] || deps['prisma']) return 'prisma';
  if (deps['drizzle-orm']) return 'drizzle';
  if (deps['sequelize']) return 'sequelize';
  return 'none';
}

export function detectUiLibrary(deps: Record<string, string>): string | undefined {
  if (deps['element-plus']) return 'element-plus';
  if (deps['antd'] || deps['@ant-design/pro-components']) return 'ant-design';
  if (deps['@mui/material']) return 'mui';
  if (deps['@chakra-ui/react']) return 'chakra-ui';
  return undefined;
}

interface DirectorySearchRule {
  candidates: string[];
}

function findFirstExistingDir(cwd: string, candidates: string[]): string | undefined {
  for (const c of candidates) {
    const abs = path.join(cwd, c);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory() && fs.readdirSync(abs).length > 0) {
      return c;
    }
  }
  // Return the first candidate as default even if empty
  return candidates[0];
}

function getDirectorySearchRules(framework: ProjectConfig['framework'], cwd: string): Record<string, DirectorySearchRule> {
  switch (framework) {
    case 'express-vue':
    case 'express-react':
      return {
        schema:       { candidates: ['backend/src/models', 'server/src/models', 'api/src/models', 'src/models'] },
        services:     { candidates: ['backend/src/services', 'server/src/services', 'api/src/services', 'src/services'] },
        middleware:   { candidates: ['backend/src/middleware', 'server/src/middleware', 'api/src/middleware', 'src/middleware'] },
        apiRoutes:    { candidates: ['backend/src/routes', 'server/src/routes', 'api/src/routes', 'src/routes'] },
        pages:        { candidates: ['frontend/src/views', 'client/src/views', 'frontend/src/pages', 'client/src/pages', 'src/views', 'src/pages'] },
        components:   { candidates: ['frontend/src/components', 'client/src/components', 'src/components'] },
        hooks:        { candidates: ['frontend/src/hooks', 'client/src/hooks', 'src/hooks'] },
        types:        { candidates: ['frontend/src/types', 'client/src/types', 'backend/src/types', 'src/types'] },
        router:       { candidates: ['frontend/src/router', 'client/src/router', 'src/router'] },
        stores:       { candidates: ['frontend/src/stores', 'client/src/stores', 'src/stores'] },
      };

    case 'nextjs': {
      const has = (p: string) => fs.existsSync(path.join(cwd, p));
      const appDir = has('app') ? 'app' : has('src/app') ? 'src/app' : undefined;
      const pagesDir = has('pages') ? 'pages' : has('src/pages') ? 'src/pages' : undefined;
      // Return rules that use the detected appDir/pagesDir
      return {
        schema:       { candidates: ['prisma/schema.prisma'] },
        pages:        { candidates: appDir ? [appDir] : pagesDir ? [pagesDir] : ['app', 'src/app'] },
        components:   { candidates: ['components', 'src/components'] },
        apiRoutes:    { candidates: appDir ? [`${appDir}/api`] : pagesDir ? [`${pagesDir}/api`] : ['app/api', 'pages/api'] },
        hooks:        { candidates: ['hooks', 'src/hooks'] },
        types:        { candidates: ['types', 'src/types'] },
      };
    }

    default:
      return {};
  }
}

function detectDirectories(
  cwd: string,
  framework: ProjectConfig['framework'],
): ProjectConfig['directories'] {
  const rules = getDirectorySearchRules(framework, cwd);
  const result: ProjectConfig['directories'] = {};

  for (const [key, rule] of Object.entries(rules)) {
    (result as Record<string, string | undefined>)[key] = findFirstExistingDir(cwd, rule.candidates);
  }

  return result;
}

function mergeSubdirDeps(cwd: string, pkg: Record<string, unknown>): Record<string, string> {
  let merged: Record<string, string> = {};

  // Collect candidate directories: common names + workspace paths from package.json
  const candidates: string[] = ['backend', 'frontend', 'server', 'client', 'src'];
  const workspaces = pkg.workspaces;
  if (Array.isArray(workspaces)) {
    for (const ws of workspaces) {
      if (typeof ws === 'string') candidates.push(ws);
    }
  }

  for (const dir of candidates) {
    const pkgPath = path.join(cwd, dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const subPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        merged = { ...merged, ...subPkg.dependencies, ...subPkg.devDependencies };
      } catch {
        // ignore malformed package.json
      }
    }
  }

  return merged;
}

export function detectProject(cwd: string): ProjectConfig {
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const rootDeps: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const subDeps = mergeSubdirDeps(cwd, pkg);
  const allDeps: Record<string, string> = { ...rootDeps, ...subDeps };

  const framework = detectFramework(allDeps);

  return {
    framework,
    orm: detectOrm(allDeps),
    typescript: fs.existsSync(path.join(cwd, 'tsconfig.json')),
    directories: detectDirectories(cwd, framework),
    packageManager: detectPackageManager(cwd),
    uiLibrary: detectUiLibrary(allDeps),
  };
}

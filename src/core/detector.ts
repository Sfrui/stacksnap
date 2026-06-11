import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfig } from '../types';

function detectPackageManager(cwd: string): ProjectConfig['packageManager'] {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function detectFramework(deps: Record<string, string>): ProjectConfig['framework'] {
  if (deps['next']) return 'nextjs';
  if (deps['express'] && deps['vue']) return 'express-vue';
  if (deps['express'] && deps['react']) return 'express-react';
  return 'unknown';
}

function detectOrm(deps: Record<string, string>): ProjectConfig['orm'] {
  if (deps['@prisma/client'] || deps['prisma']) return 'prisma';
  if (deps['drizzle-orm']) return 'drizzle';
  if (deps['sequelize']) return 'sequelize';
  return 'none';
}

function detectDirectories(
  cwd: string,
  framework: ProjectConfig['framework'],
): ProjectConfig['directories'] {
  const has = (p: string) => fs.existsSync(path.join(cwd, p));

  if (framework === 'nextjs') {
    const appDir = has('app') ? 'app' : has('src/app') ? 'src/app' : undefined;
    const pagesDir = has('pages') ? 'pages' : has('src/pages') ? 'src/pages' : undefined;
    return {
      schema: 'prisma/schema.prisma',
      pages: appDir ?? pagesDir,
      components: has('components') ? 'components' : has('src/components') ? 'src/components' : undefined,
      apiRoutes: appDir ? `${appDir}/api` : pagesDir ? `${pagesDir}/api` : undefined,
      hooks: has('hooks') ? 'hooks' : has('src/hooks') ? 'src/hooks' : undefined,
      types: has('types') ? 'types' : has('src/types') ? 'src/types' : undefined,
    };
  }

  if (framework === 'express-vue') {
    // Try direct paths first, then workspace-nested paths; prefer directories with content
    const findDir = (direct: string, nested: string) => {
      const directAbs = path.join(cwd, direct);
      const nestedAbs = path.join(cwd, nested);
      const directExists = fs.existsSync(directAbs) && fs.readdirSync(directAbs).length > 0;
      const nestedExists = fs.existsSync(nestedAbs) && fs.readdirSync(nestedAbs).length > 0;
      if (nestedExists) return nested;
      if (directExists) return direct;
      return nested; // default to nested path even if empty
    };

    return {
      schema: findDir('backend/src/models', 'smart-bottle-platform/backend/src/models'),
      services: findDir('backend/src/services', 'smart-bottle-platform/backend/src/services'),
      middleware: findDir('backend/src/middleware', 'smart-bottle-platform/backend/src/middleware'),
      apiRoutes: findDir('backend/src/routes', 'smart-bottle-platform/backend/src/routes'),
      pages: findDir('frontend/src/views', 'smart-bottle-platform/frontend/src/views'),
      components: findDir('frontend/src/components', 'smart-bottle-platform/frontend/src/components'),
      hooks: findDir('frontend/src/hooks', 'smart-bottle-platform/frontend/src/hooks'),
      types: findDir('frontend/src/types', 'smart-bottle-platform/frontend/src/types'),
      router: findDir('frontend/src/router', 'smart-bottle-platform/frontend/src/router'),
      stores: findDir('frontend/src/stores', 'smart-bottle-platform/frontend/src/stores'),
    };
  }

  if (framework === 'express-react') {
    return {
      schema: 'prisma/schema.prisma',
      pages: 'src/pages',
      components: 'src/components',
      apiRoutes: 'src/routes',
      hooks: 'src/hooks',
      types: 'src/types',
    };
  }

  return {};
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

  return {
    framework: detectFramework(allDeps),
    orm: detectOrm(allDeps),
    typescript: fs.existsSync(path.join(cwd, 'tsconfig.json')),
    directories: detectDirectories(cwd, detectFramework(allDeps)),
    packageManager: detectPackageManager(cwd),
  };
}

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
  if (deps['express'] && deps['react']) return 'express-react';
  return 'unknown';
}

function detectOrm(deps: Record<string, string>): ProjectConfig['orm'] {
  if (deps['@prisma/client'] || deps['prisma']) return 'prisma';
  if (deps['drizzle-orm']) return 'drizzle';
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
    const base = appDir ?? pagesDir;
    return {
      schema: 'prisma/schema.prisma',
      pages: appDir ?? pagesDir,
      components: has('components') ? 'components' : has('src/components') ? 'src/components' : undefined,
      apiRoutes: appDir ? `${appDir}/api` : pagesDir ? `${pagesDir}/api` : undefined,
      hooks: has('hooks') ? 'hooks' : has('src/hooks') ? 'src/hooks' : undefined,
      types: has('types') ? 'types' : has('src/types') ? 'src/types' : undefined,
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

export function detectProject(cwd: string): ProjectConfig {
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const allDeps: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  return {
    framework: detectFramework(allDeps),
    orm: detectOrm(allDeps),
    typescript: fs.existsSync(path.join(cwd, 'tsconfig.json')),
    directories: detectDirectories(cwd, detectFramework(allDeps)),
    packageManager: detectPackageManager(cwd),
  };
}

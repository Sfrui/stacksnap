import { describe, it, expect, vi } from 'vitest';
import { installDependencies } from '../../core/injector/dependency-installer';
import { ProjectConfig, SceneDependency } from '../../types';

// Mock child_process.execFileSync
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'child_process';
const mockExec = vi.mocked(execFileSync);

function makeConfig(pm: ProjectConfig['packageManager'] = 'npm'): ProjectConfig {
  return {
    framework: 'express-react',
    orm: 'prisma',
    typescript: true,
    directories: {},
    packageManager: pm,
  };
}

describe('installDependencies', () => {
  it('does nothing when deps array is empty', () => {
    installDependencies([], makeConfig(), '/test');
    expect(mockExec).not.toHaveBeenCalled();
  });

  it('uses npm install for npm package manager', () => {
    const deps: SceneDependency[] = [
      { package: 'zod', version: '^3.23.8' },
      { package: 'bcryptjs', version: '^2.4.3' },
    ];
    installDependencies(deps, makeConfig('npm'), '/test');

    expect(mockExec).toHaveBeenCalledWith(
      'npm',
      ['install', 'zod@^3.23.8', 'bcryptjs@^2.4.3'],
      { cwd: '/test', stdio: 'inherit' },
    );
  });

  it('uses yarn add for yarn package manager', () => {
    const deps: SceneDependency[] = [{ package: 'zod', version: '^3.23.8' }];
    installDependencies(deps, makeConfig('yarn'), '/test');

    expect(mockExec).toHaveBeenCalledWith(
      'yarn',
      ['add', 'zod@^3.23.8'],
      { cwd: '/test', stdio: 'inherit' },
    );
  });

  it('uses pnpm add for pnpm package manager', () => {
    const deps: SceneDependency[] = [{ package: 'zod', version: '^3.23.8' }];
    installDependencies(deps, makeConfig('pnpm'), '/test');

    expect(mockExec).toHaveBeenCalledWith(
      'pnpm',
      ['add', 'zod@^3.23.8'],
      { cwd: '/test', stdio: 'inherit' },
    );
  });

  it('throws for unsupported package manager', () => {
    const deps: SceneDependency[] = [{ package: 'zod', version: '^3.23.8' }];
    const config = makeConfig('npm');
    (config as any).packageManager = 'bun';

    expect(() => installDependencies(deps, config, '/test')).toThrow('Unsupported package manager');
  });

  it('passes each package as a separate argument (no shell injection)', () => {
    const deps: SceneDependency[] = [{ package: 'zod', version: '^3.23.8' }];
    installDependencies(deps, makeConfig('npm'), '/test');

    const [cmd, args] = mockExec.mock.calls[0];
    // Verify it's execFileSync with array args, not a single string
    expect(cmd).toBe('npm');
    expect(Array.isArray(args)).toBe(true);
    expect(args).toContain('install');
    expect(args).toContain('zod@^3.23.8');
  });
});

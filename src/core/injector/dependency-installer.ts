import { execFileSync } from 'child_process';
import { SceneDependency, ProjectConfig } from '../../types';

export function installDependencies(
  deps: SceneDependency[],
  config: ProjectConfig,
  cwd: string,
): void {
  if (deps.length === 0) return;

  const packages = deps.map((d) => `${d.package}@${d.version}`);

  const commands: Record<ProjectConfig['packageManager'], string[]> = {
    npm: ['npm', 'install'],
    yarn: ['yarn', 'add'],
    pnpm: ['pnpm', 'add'],
  };

  const cmd = commands[config.packageManager];
  if (!cmd) {
    throw new Error(`Unsupported package manager: ${config.packageManager}`);
  }

  console.log(`Installing dependencies: ${deps.map((d) => d.package).join(', ')}`);

  execFileSync(cmd[0], [...cmd.slice(1), ...packages], { cwd, stdio: 'inherit' });
}

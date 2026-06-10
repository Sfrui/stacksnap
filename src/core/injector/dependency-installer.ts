import { execSync } from 'child_process';
import { SceneDependency, ProjectConfig } from '../../types';

export function installDependencies(
  deps: SceneDependency[],
  config: ProjectConfig,
  cwd: string,
): void {
  if (deps.length === 0) return;

  const packages = deps.map((d) => `${d.package}@${d.version}`).join(' ');

  const commands: Record<ProjectConfig['packageManager'], string> = {
    npm: `npm install ${packages}`,
    yarn: `yarn add ${packages}`,
    pnpm: `pnpm add ${packages}`,
  };

  const cmd = commands[config.packageManager];
  console.log(`Installing dependencies: ${deps.map((d) => d.package).join(', ')}`);

  execSync(cmd, { cwd, stdio: 'inherit' });
}

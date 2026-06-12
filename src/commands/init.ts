import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { detectProject } from '../core/detector';

export function initCommand(): void {
  const cwd = process.cwd();
  const pkgPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.error(chalk.red('Error: No package.json found in the current directory.'));
    process.exit(1);
  }

  const config = detectProject(cwd);
  const outPath = path.join(cwd, '.stacksnap.json');

  fs.writeJsonSync(outPath, config, { spaces: 2 });

  console.log(chalk.green('StackSnap initialized successfully!'));
  console.log(`  Framework:    ${chalk.cyan(config.framework)}`);
  console.log(`  ORM:          ${chalk.cyan(config.orm)}`);
  console.log(`  TypeScript:   ${chalk.cyan(String(config.typescript))}`);
  console.log(`  UI Library:   ${chalk.cyan(config.uiLibrary || 'auto')}`);
  console.log(`  Pkg Manager:  ${chalk.cyan(config.packageManager)}`);
  console.log(`\nConfig written to: ${chalk.dim(outPath)}`);
  console.log(chalk.dim('  Edit .stacksnap.json to override detected directories or set locale.'));
}

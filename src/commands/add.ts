import * as fs from 'fs-extra';
import * as path from 'path';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { detectProject } from '../core/detector';
import { loadAllScenes } from '../core/scene-loader';
import { generateSceneCode } from '../core/code-generator';
import { injectFiles } from '../core/injector/file-injector';
import { installDependencies } from '../core/injector/dependency-installer';
import { isGitRepo, setupGitBranch, commitChanges, rollback } from '../utils/git';
import { getAdapterForConfig } from '../adapters/registry';
import { ProjectConfig, SceneDefinition, GeneratedFile } from '../types';

function categorizeFile(filePath: string): string {
  const p = filePath.replace(/\\/g, '/');
  if (p.includes('/models/')) return 'Backend Models';
  if (p.includes('/services/')) return 'Backend Services';
  if (p.includes('/routes/')) return 'Backend Routes';
  if (p.includes('/middleware/')) return 'Backend Middleware';
  if (p.includes('/api/')) return 'Frontend API';
  if (p.includes('/views/')) return 'Frontend Pages';
  if (p.includes('/components/')) return 'Frontend Components';
  if (p.includes('/hooks/')) return 'Frontend Hooks';
  if (p.includes('/router/')) return 'Frontend Router';
  if (p.includes('/stores/')) return 'Frontend Stores';
  return 'Other';
}

function displayGroupedFiles(files: GeneratedFile[]): void {
  const groups = new Map<string, GeneratedFile[]>();
  for (const f of files) {
    const cat = categorizeFile(f.filePath);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(f);
  }

  const categoryOrder = [
    'Backend Models', 'Backend Services', 'Backend Routes', 'Backend Middleware',
    'Frontend API', 'Frontend Pages', 'Frontend Components', 'Frontend Hooks',
    'Frontend Router', 'Frontend Stores', 'Other',
  ];

  for (const cat of categoryOrder) {
    const items = groups.get(cat);
    if (!items) continue;
    console.log(chalk.bold(`\n  ${cat}:`));
    for (const f of items) {
      const tag = f.action === 'create'
        ? chalk.green.bold('[CREATE]')
        : chalk.yellow.bold('[MODIFY]');
      console.log(`    ${tag} ${f.filePath}`);
    }
  }
}

export async function addCommand(preselectedScene?: string): Promise<void> {
  const cwd = process.cwd();
  let branchCreated = false;
  let scene: SceneDefinition | null = null;

  try {
    // --- Step 1: Load or create config ---
    const configPath = path.join(cwd, '.stacksnap.json');

    if (!fs.existsSync(configPath)) {
      if (!fs.existsSync(path.join(cwd, 'package.json'))) {
        console.error(chalk.red('Error: No package.json found. Run this command in a project root.'));
        process.exit(1);
      }
      const spinner = ora('Detecting project...').start();
      const config = detectProject(cwd);
      fs.writeJsonSync(configPath, config, { spaces: 2 });
      spinner.succeed(`Detected: ${chalk.cyan(config.framework)} + ${chalk.cyan(config.orm)}`);
    }

    const config: ProjectConfig = fs.readJsonSync(configPath);

    // --- Step 2: Scene selection ---
    const scenes = loadAllScenes();

    let selected: string;
    if (preselectedScene) {
      const found = scenes.find((s) => s.name === preselectedScene);
      if (!found) {
        console.error(chalk.red(`Error: Scene "${preselectedScene}" not found. Available: ${scenes.map(s => s.name).join(', ')}`));
        process.exit(1);
      }
      selected = preselectedScene;
      console.log(chalk.cyan(`Using scene: ${preselectedScene}`));
    } else {
      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'selected',
          message: 'Select a scene to add:',
          choices: scenes.map((s) => ({
            name: `${chalk.bold(s.name)} — ${s.description}`,
            value: s.name,
          })),
        },
      ]);
      selected = answer.selected;
    }

    scene = scenes.find((s) => s.name === selected)!;
    console.log(chalk.green(`\nSelected scene: ${scene.name}`));

    // --- Step 2.5: Dependency check ---
    if (scene.dependsOn && scene.dependsOn.length > 0) {
      const installedScenes: string[] = [];
      for (const dep of scene.dependsOn) {
        // Check if the dependency scene has been installed by looking for its markers
        const depScene = scenes.find(s => s.name === dep);
        if (depScene) {
          // A simple heuristic: check if any service file contains the dependency scene name marker
          const servicesDir = config.directories.services;
          if (servicesDir) {
            const absDir = path.join(cwd, servicesDir);
            if (fs.existsSync(absDir)) {
              const files = fs.readdirSync(absDir).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
              for (const f of files) {
                const content = fs.readFileSync(path.join(absDir, f), 'utf-8');
                if (content.includes(`// [stacksnap] ${dep}`) || content.includes(`@stacksnap added`)) {
                  installedScenes.push(dep);
                  break;
                }
              }
            }
          }
        }
      }
      const missing = scene.dependsOn.filter(d => !installedScenes.includes(d));
      if (missing.length > 0) {
        console.log(chalk.yellow(`\nWarning: This scene depends on: ${missing.join(', ')}.`));
        console.log(chalk.yellow('Install them first for best results.'));
        if (!preselectedScene) {
          const { proceed } = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: 'Continue anyway?',
            default: true,
          }]);
          if (!proceed) {
            console.log(chalk.yellow('Aborted.'));
            return;
          }
        }
      }
    }

    // --- Step 3: Git branch ---
    const hasGit = await isGitRepo(cwd);
    if (hasGit) {
      const branchName = `stacksnap/${scene.name}`;
      branchCreated = await setupGitBranch(cwd, branchName);
      if (branchCreated) {
        console.log(chalk.blue(`Created branch: ${branchName}`));
      }
    } else {
      console.log(chalk.yellow('Not a git repository, skipping branch creation.'));
    }

    // --- Step 4: AI code generation (multi-batch) ---
    const genSpinner = ora('Generating code with AI...').start();
    const files = await generateSceneCode(scene, config, cwd, (step) => {
      genSpinner.text = step;
    });

    if (files.length === 0) {
      genSpinner.info('No new code to generate (all components already exist).');
      console.log(chalk.dim('Nothing to inject for this scene.'));
      return;
    } else {
      genSpinner.succeed(`Generated ${files.length} file(s)`);
    }

    // --- Step 5: Confirmation ---
    console.log(chalk.bold('\nThe following files will be affected:'));
    displayGroupedFiles(files);

    const { confirm } = preselectedScene ? { confirm: true } : await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with injection?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Aborted.'));
      return;
    }

    // --- Step 6: Inject files ---
    const adapter = getAdapterForConfig(config);
    const registrationFiles = [
      ...adapter.backend.registrationFiles(),
      ...(adapter.frontend.routerFile() ? [adapter.frontend.routerFile()!] : []),
    ];
    const injectSpinner = ora('Injecting files...').start();
    const result = injectFiles(files, cwd, { registrationFiles });
    injectSpinner.succeed('Files injected');

    if (result.created.length > 0) console.log(chalk.green(`  Created: ${result.created.join(', ')}`));
    if (result.modified.length > 0) console.log(chalk.yellow(`  Modified: ${result.modified.join(', ')}`));
    if (result.skipped.length > 0) console.log(chalk.dim(`  Skipped: ${result.skipped.join(', ')}`));

    // --- Step 7: Install dependencies ---
    if (scene.dependencies.length > 0) {
      const depSpinner = ora('Installing dependencies...').start();
      try {
        installDependencies(scene.dependencies, config, cwd);
        depSpinner.succeed('Dependencies installed');
      } catch (err) {
        depSpinner.fail('Dependency installation failed');
        throw err;
      }
    }

    // --- Step 8: Git commit ---
    if (hasGit && branchCreated) {
      const committed = await commitChanges(cwd, `stacksnap: add ${scene.name} scene`);
      if (committed) {
        console.log(chalk.blue('Changes committed.'));
      }
    }

    console.log(chalk.green.bold(`\nScene "${scene.name}" added successfully!`));
  } catch (err) {
    const message = (err as Error).message;
    console.error(chalk.red(`\nError: ${message}`));

    if (branchCreated && scene) {
      console.log(chalk.yellow('Rolling back...'));
      await rollback(cwd, `stacksnap/${scene.name}`);
    }

    process.exit(1);
  }
}

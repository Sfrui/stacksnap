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
import { ProjectConfig, SceneDefinition } from '../types';

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

    // --- Step 4: AI code generation ---
    const genSpinner = ora('Generating code with AI...').start();
    const files = await generateSceneCode(scene, config, cwd);

    if (files.length === 0) {
      genSpinner.info('No new schema models to generate (all entities already exist).');
    } else {
      genSpinner.succeed(`Generated ${files.length} file(s)`);
    }

    if (files.length === 0) {
      console.log(chalk.dim('Nothing to inject for this scene.'));
      return;
    }

    // --- Step 5: Confirmation ---
    console.log(chalk.bold('\nThe following files will be affected:'));
    for (const f of files) {
      const tag = f.action === 'create'
        ? chalk.green.bold('[CREATE]')
        : chalk.yellow.bold('[MODIFY]');
      console.log(`  ${tag} ${f.filePath}`);
    }

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
    const injectSpinner = ora('Injecting files...').start();
    const result = injectFiles(files, cwd);
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

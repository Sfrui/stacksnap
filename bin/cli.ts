#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from '../src/commands/init';
import { addCommand } from '../src/commands/add';

const program = new Command();

program
  .name('stacksnap')
  .description('StackSnap - AI-powered full-stack code generator')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize StackSnap in the current project')
  .action(() => {
    initCommand();
  });

program
  .command('add')
  .description('Add a full-stack scene to the project')
  .argument('[scene]', 'Scene name to add (skips interactive selection)')
  .action(async (scene?: string) => {
    await addCommand(scene);
  });

program.parse();

#!/usr/bin/env node
import { Command } from 'commander';
import { runCommand } from './commands/run';
import { dryRunCommand } from './commands/dryRun';
import { validateCommand } from './commands/validate';

const program = new Command();

program
  .name('mediasmith')
  .description('YAML-driven ffmpeg helper & batch processor')
  .version('0.1.0');

program
  .command('run')
  .argument('<config>', 'Path to YAML config file')
  .action(runCommand);

program
  .command('dry-run')
  .argument('<config>', 'Path to YAML config file')
  .action(dryRunCommand);

program
  .command('validate')
  .argument('<config>', 'Path to YAML config file')
  .action(validateCommand);

program.parse(process.argv);

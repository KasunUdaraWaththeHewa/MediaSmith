#!/usr/bin/env node
import { Command } from 'commander';
import { runCommand } from './commands/run';
import { dryRunCommand } from './commands/dryRun';
import { validateCommand } from './commands/validate';
import { collectSet } from './commands/options';

const program = new Command();

program
  .name('mediasmith')
  .description('YAML-driven ffmpeg helper & batch processor')
  .version('0.1.0');

program
  .command('run')
  .argument('<config>', 'Path to YAML config file')
  .option('--set <path=value>', 'Override a job field (repeatable)', collectSet, [])
  .action(runCommand);

program
  .command('dry-run')
  .argument('<config>', 'Path to YAML config file')
  .option('--set <path=value>', 'Override a job field (repeatable)', collectSet, [])
  .action(dryRunCommand);

program
  .command('validate')
  .argument('<config>', 'Path to YAML config file')
  .option('--set <path=value>', 'Override a job field (repeatable)', collectSet, [])
  .action(validateCommand);

program.parseAsync(process.argv).catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

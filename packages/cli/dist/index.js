#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const run_1 = require("./commands/run");
const dryRun_1 = require("./commands/dryRun");
const validate_1 = require("./commands/validate");
const program = new commander_1.Command();
program
    .name('mediasmith')
    .description('YAML-driven ffmpeg helper & batch processor')
    .version('0.1.0');
program
    .command('run')
    .argument('<config>', 'Path to YAML config file')
    .action(run_1.runCommand);
program
    .command('dry-run')
    .argument('<config>', 'Path to YAML config file')
    .action(dryRun_1.dryRunCommand);
program
    .command('validate')
    .argument('<config>', 'Path to YAML config file')
    .action(validate_1.validateCommand);
program.parse(process.argv);

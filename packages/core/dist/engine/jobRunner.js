"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runJobFromConfig = runJobFromConfig;
const batchPlanner_1 = require("../planner/batchPlanner");
const ffprobe_1 = require("../ffmpeg/ffprobe");
const actions_1 = require("../ffmpeg/actions");
const executor_1 = require("../ffmpeg/executor");
async function runJobFromConfig(config, opts = {}) {
    const job = await (0, batchPlanner_1.planJob)(config);
    opts.onLog?.(`Planning job "${job.jobName}" (${job.tasks.length} tasks)`);
    for (const task of job.tasks) {
        opts.onLog?.(`Task ${task.id}: ${task.inputFiles.join(', ')} -> ${task.outputFile}`);
        // Ensure output dir exists
        const path = await import('path');
        const fs = await import('fs');
        await fs.promises.mkdir(path.dirname(task.outputFile), { recursive: true });
        // Basic pipeline assumption: for now we support:
        // - single-step that either:
        //    * merge_audio (needs 2 inputs) OR
        //    * compress_video (needs probe)
        // Later you can support multi-step sequences.
        for (const step of task.steps) {
            let probe = undefined;
            if (step.action === 'compress_video') {
                probe = await (0, ffprobe_1.ffprobeVideo)(task.inputFiles[0]);
            }
            const args = (0, actions_1.buildArgsForStep)(step, {
                inputFiles: task.inputFiles,
                outputFile: task.outputFile,
                probe
            });
            opts.onLog?.(`Running step "${step.action}"...`);
            await (0, executor_1.runFfmpeg)(args, { dryRun: opts.dryRun, onLog: opts.onLog });
        }
    }
    opts.onLog?.('Job complete');
}

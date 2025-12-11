import { JobConfigValidated } from '../yaml/schema';
import { planJob } from '../planner/batchPlanner';
import { ffprobeVideo } from '../ffmpeg/ffprobe';
import { buildArgsForStep } from '../ffmpeg/actions';
import { runFfmpeg } from '../ffmpeg/executor';

export interface RunOptions {
  dryRun?: boolean;
  onLog?: (msg: string) => void;
}

export async function runJobFromConfig(config: JobConfigValidated, opts: RunOptions = {}) {
  const job = await planJob(config);

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
        probe = await ffprobeVideo(task.inputFiles[0]);
      }

      const args = buildArgsForStep(step, {
        inputFiles: task.inputFiles,
        outputFile: task.outputFile,
        probe
      });

      opts.onLog?.(`Running step "${step.action}"...`);
      await runFfmpeg(args, { dryRun: opts.dryRun, onLog: opts.onLog });
    }
  }

  opts.onLog?.('Job complete');
}

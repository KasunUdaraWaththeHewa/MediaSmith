import fs from 'fs';
import path from 'path';
import type { Task } from '../domain/Job';
import { prepareActionStep } from '../ffmpeg/actions';
import { runFfmpeg } from '../ffmpeg/executor';
import { ffprobeVideo } from '../ffmpeg/ffprobe';
import type { VideoProbeInfo } from '../ffmpeg/ffprobe';
import { errorMessage, MediaSmithError } from '../errors';

export interface RunOptions {
  dryRun?: boolean;
  onLog?: (message: string) => void;
}

function temporaryOutputFor(task: Task, stepIndex: number, extension: string): string {
  const name = path.basename(task.outputFile, path.extname(task.outputFile));
  return path.join(
    path.dirname(task.outputFile),
    `.${name}.mediasmith-${task.id}-${stepIndex}${extension}`
  );
}

async function removeTemporaryFiles(files: string[], onLog?: RunOptions['onLog']): Promise<void> {
  const cleanup = await Promise.allSettled(
    files.map((file) => fs.promises.rm(file, { force: true }))
  );
  for (const result of cleanup) {
    if (result.status === 'rejected') {
      onLog?.(`Temporary file cleanup failed: ${String(result.reason)}`);
    }
  }
}

export async function runTask(task: Task, options: RunOptions): Promise<void> {
  options.onLog?.(`Task ${task.id}: ${task.inputFiles.join(', ')} -> ${task.outputFile}`);
  const temporaryFiles: string[] = [];
  let currentInput = task.inputFiles[0];
  let activeStep: { index: number; action: string } | undefined;

  try {
    const preparedSteps = task.steps.map(prepareActionStep);
    let previewProbe: VideoProbeInfo | undefined;
    if (options.dryRun && preparedSteps.some((step) => step.needsProbe)) {
      previewProbe = await ffprobeVideo(currentInput);
    }

    if (!options.dryRun) {
      await fs.promises.mkdir(path.dirname(task.outputFile), { recursive: true });
    }

    for (const [index, action] of preparedSteps.entries()) {
      const step = task.steps[index];
      activeStep = { index, action: step.action };
      const isFinalStep = index === task.steps.length - 1;
      const extension = isFinalStep ? path.extname(task.outputFile) : action.defaultExtension;
      const outputFile = temporaryOutputFor(task, index, extension);
      temporaryFiles.push(outputFile);
      let probe: VideoProbeInfo | undefined;
      if (action.needsProbe) {
        probe = options.dryRun ? previewProbe : await ffprobeVideo(currentInput);
        if (!probe) {
          throw new Error(
            `Cannot estimate media metadata for dry-run step ${index + 1} (${step.action})`
          );
        }
      }
      const args = action.buildArgs({
        inputFiles: [currentInput, ...task.inputFiles.slice(1)],
        outputFile,
        probe,
        settings: task.settings
      });

      options.onLog?.(`Running step "${step.action}"...`);
      await runFfmpeg(args, options);
      if (options.dryRun && previewProbe) {
        previewProbe = action.estimateProbe(previewProbe, task.settings);
      }
      currentInput = outputFile;
    }

    if (!options.dryRun) {
      for (const [index, action] of preparedSteps.entries()) {
        activeStep = { index, action: task.steps[index].action };
        await action.validateOutput(currentInput);
      }
      activeStep = undefined;
      await fs.promises.rename(currentInput, task.outputFile);
    }
  } catch (error) {
    const stepContext = activeStep ? `step ${activeStep.index + 1} (${activeStep.action}): ` : '';
    throw new MediaSmithError(
      'TASK',
      `Task ${task.id} (${task.inputFiles.join(', ')}) failed: ${stepContext}${errorMessage(error)}`,
      { taskId: task.id, stepIndex: activeStep?.index, action: activeStep?.action },
      error
    );
  } finally {
    if (!options.dryRun) {
      await removeTemporaryFiles(temporaryFiles, options.onLog);
    }
  }
}

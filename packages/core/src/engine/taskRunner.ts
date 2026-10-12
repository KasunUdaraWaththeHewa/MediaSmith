import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { PreparedTask, Task } from '../domain/Job';
import { inputPaths } from '../domain/Inputs';
import type { VideoProbeInfo } from '../ffmpeg/ffprobe';
import { defaultMediaProcessRunner } from '../ffmpeg/processRunner';
import { errorMessage, MediaSmithError } from '../errors';
import type { RunOptions } from './options';
import { runStep } from './stepRunner';

export type { RunOptions } from './options';

function temporaryOutputFor(
  task: Pick<Task, 'id' | 'outputFile'>,
  runToken: string,
  stepIndex: number,
  extension: string
): string {
  const name = path.basename(task.outputFile, path.extname(task.outputFile));
  return path.join(
    path.dirname(task.outputFile),
    `.${name}.mediasmith-${task.id}-${runToken}-${stepIndex}${extension}`
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

export async function runTask(task: PreparedTask, options: RunOptions): Promise<void> {
  options.onLog?.(`Task ${task.id}: ${inputPaths(task.inputs).join(', ')} -> ${task.outputFile}`);
  const temporaryFiles: string[] = [];
  // Real runs need unique paths; previews use a fixed token for reproducible logs.
  const runToken = options.dryRun ? 'preview' : crypto.randomBytes(6).toString('hex');
  let currentInput = task.inputs.primary;
  let activeStep: { index: number; action: string } | undefined;

  try {
    options.signal?.throwIfAborted();
    const processes = options.processRunner ?? defaultMediaProcessRunner;
    const preparedSteps = task.steps;
    let previewProbe: VideoProbeInfo | undefined;
    if (options.dryRun && preparedSteps.some((step) => step.handler.needsProbe)) {
      // Later preview steps use estimated metadata because intermediate files do not exist.
      previewProbe = await processes.probeVideo(currentInput, { signal: options.signal });
    }

    if (!options.dryRun) {
      await fs.promises.mkdir(path.dirname(task.outputFile), { recursive: true });
    }

    for (const [index, step] of preparedSteps.entries()) {
      const action = step.handler;
      activeStep = { index, action: step.action };
      const isFinalStep = index === task.steps.length - 1;
      const extension = isFinalStep ? path.extname(task.outputFile) : action.defaultExtension;
      const outputFile = temporaryOutputFor(task, runToken, index, extension);
      // Track the path before execution so failures and cancellation clean up partial output.
      temporaryFiles.push(outputFile);
      previewProbe = await runStep({
        step,
        stepIndex: index,
        inputs: { ...task.inputs, primary: currentInput },
        outputFile,
        settings: task.settings,
        previewProbe,
        options,
        processes
      });
      currentInput = outputFile;
    }

    if (!options.dryRun) {
      options.signal?.throwIfAborted();
      activeStep = undefined;
      // Publish only after every step and its output check have succeeded.
      await fs.promises.rename(currentInput, task.outputFile);
    }
  } catch (error) {
    const stepContext = activeStep ? `step ${activeStep.index + 1} (${activeStep.action}): ` : '';
    throw new MediaSmithError(
      'TASK',
      `Task ${task.id} (${inputPaths(task.inputs).join(', ')}) failed: ${stepContext}${errorMessage(error)}`,
      { taskId: task.id, stepIndex: activeStep?.index, action: activeStep?.action },
      error
    );
  } finally {
    if (!options.dryRun) {
      await removeTemporaryFiles(temporaryFiles, options.onLog);
    }
  }
}

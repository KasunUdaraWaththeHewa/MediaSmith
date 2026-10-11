import fs from 'fs';
import path from 'path';
import type { Task } from '../domain/Job';
import { buildArgsForStep, getActionDefinition } from '../ffmpeg/actions';
import { runFfmpeg } from '../ffmpeg/executor';
import { ffprobeVideo } from '../ffmpeg/ffprobe';

export interface RunOptions {
  dryRun?: boolean;
  onLog?: (message: string) => void;
}

function temporaryOutputFor(task: Task, stepIndex: number, extension: string): string {
  const name = path.basename(task.outputFile, path.extname(task.outputFile));
  return path.join(path.dirname(task.outputFile), `.${name}.mediasmith-${task.id}-${stepIndex}${extension}`);
}

async function removeTemporaryFiles(files: string[], onLog?: RunOptions['onLog']): Promise<void> {
  const cleanup = await Promise.allSettled(files.map(file => fs.promises.rm(file, { force: true })));
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

  try {
    if (!options.dryRun) {
      await fs.promises.mkdir(path.dirname(task.outputFile), { recursive: true });
    }

    for (const [index, step] of task.steps.entries()) {
      const action = getActionDefinition(step.action);
      if (!action) throw new Error(`Unknown or unimplemented action: ${step.action}`);

      const isFinalStep = index === task.steps.length - 1;
      const extension = isFinalStep ? path.extname(task.outputFile) : action.defaultExtension(step);
      const outputFile = temporaryOutputFor(task, index, extension);
      temporaryFiles.push(outputFile);
      const probe = action.needsProbe
        ? await ffprobeVideo(options.dryRun ? task.inputFiles[0] : currentInput)
        : undefined;
      const args = buildArgsForStep(step, {
        inputFiles: [currentInput, ...task.inputFiles.slice(1)],
        outputFile,
        probe,
        settings: task.settings
      });

      options.onLog?.(`Running step "${step.action}"...`);
      await runFfmpeg(args, options);
      currentInput = outputFile;
    }

    if (!options.dryRun) {
      for (const step of task.steps) {
        const action = getActionDefinition(step.action);
        await action?.validateOutput?.(step, currentInput);
      }
      await fs.promises.rename(currentInput, task.outputFile);
    }
  } catch (error) {
    throw new Error(`Task ${task.id} (${task.inputFiles.join(', ')}) failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (!options.dryRun) {
      await removeTemporaryFiles(temporaryFiles, options.onLog);
    }
  }
}

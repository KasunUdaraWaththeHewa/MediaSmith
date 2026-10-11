import path from 'path';
import type { PlannedJob, Task } from '../domain/Job';
import { getActionDefinition } from '../ffmpeg/actions';

function pathKey(file: string): string {
  const absolute = path.resolve(file);
  return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
}

function validateTaskSteps(task: Task): void {
  let currentKind: 'video' | 'audio' = 'video';
  for (const [index, step] of task.steps.entries()) {
    const action = getActionDefinition(step.action);
    if (!action) throw new Error(`Unknown or unimplemented action: ${step.action}`);
    if (action.inputKind !== currentKind) {
      throw new Error(`${step.action} expects ${action.inputKind} input after a ${currentKind} step`);
    }
    if (action.needsExternalAudio && task.inputFiles.length < 2) {
      throw new Error(`Task ${task.id} requires paired external audio`);
    }
    currentKind = action.outputKind;

    if (index === task.steps.length - 1) {
      const extension = path.extname(task.outputFile).toLowerCase();
      if (!action.outputExtensions(step).includes(extension)) {
        throw new Error(
          `Output extension ${extension || '(none)'} is incompatible with ${step.action}: ${task.outputFile}`
        );
      }
    }
  }
}

export function validatePlan(job: PlannedJob): void {
  const outputs = new Set<string>();
  const inputs = new Set(job.tasks.flatMap(task => task.inputFiles.map(pathKey)));
  for (const task of job.tasks) {
    const output = pathKey(task.outputFile);
    if (outputs.has(output)) throw new Error(`Multiple tasks would write to ${task.outputFile}`);
    outputs.add(output);
    if (inputs.has(output)) throw new Error(`Output may overwrite an input file: ${task.outputFile}`);
    validateTaskSteps(task);
  }
}

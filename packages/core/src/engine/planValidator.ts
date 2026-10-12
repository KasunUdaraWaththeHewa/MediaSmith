import fs from 'fs';
import path from 'path';
import type { PlannedJob, PreparedJob, PreparedStep, PreparedTask, Task } from '../domain/Job';
import { inputPaths } from '../domain/Inputs';
import { prepareActionStep } from '../ffmpeg/actions';

function pathKey(file: string): string {
  // Resolve existing ancestors so directory aliases cannot hide an input/output collision.
  let existingAncestor = path.resolve(file);
  const missingParts: string[] = [];
  let absolute: string;
  while (true) {
    try {
      absolute = path.join(fs.realpathSync.native(existingAncestor), ...missingParts);
      break;
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
      const parent = path.dirname(existingAncestor);
      if (parent === existingAncestor) throw error;
      missingParts.unshift(path.basename(existingAncestor));
      existingAncestor = parent;
    }
  }
  // Windows paths are case insensitive, so collision checks must be too.
  return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
}

function prepareSteps(task: Task): PreparedStep[] {
  return task.steps.map((step) => ({ action: step.action, handler: prepareActionStep(step) }));
}

function prepareTask(task: Task, preparedSteps: PreparedStep[]): PreparedTask {
  let currentKind: 'video' | 'audio' = 'video';
  for (const [index, step] of preparedSteps.entries()) {
    const action = step.handler;
    if (action.inputKind !== currentKind) {
      throw new Error(
        `${step.action} expects ${action.inputKind} input after a ${currentKind} step`
      );
    }
    if (action.needsExternalAudio && !task.inputs.externalAudio) {
      throw new Error(`Task ${task.id} requires paired external audio`);
    }
    currentKind = action.outputKind;

    if (index === task.steps.length - 1) {
      const extension = path.extname(task.outputFile).toLowerCase();
      if (!action.outputExtensions.includes(extension)) {
        throw new Error(
          `Output extension ${extension || '(none)'} is incompatible with ${step.action}: ${task.outputFile}`
        );
      }
    }
  }
  return { ...task, steps: preparedSteps };
}

export function validatePlan(job: PlannedJob): PreparedJob {
  const outputs = new Set<string>();
  // Check all inputs first: a task must not overwrite media needed by another task.
  const inputs = new Set(job.tasks.flatMap((task) => inputPaths(task.inputs).map(pathKey)));
  // Planner tasks share a step list; prepare it once while retaining support for distinct lists.
  const preparedBySteps = new WeakMap<Task['steps'], PreparedStep[]>();
  const tasks: PreparedTask[] = [];
  for (const task of job.tasks) {
    const output = pathKey(task.outputFile);
    if (outputs.has(output)) throw new Error(`Multiple tasks would write to ${task.outputFile}`);
    outputs.add(output);
    if (inputs.has(output))
      throw new Error(`Output may overwrite an input file: ${task.outputFile}`);
    let preparedSteps = preparedBySteps.get(task.steps);
    if (!preparedSteps) {
      preparedSteps = prepareSteps(task);
      preparedBySteps.set(task.steps, preparedSteps);
    }
    tasks.push(prepareTask(task, preparedSteps));
  }
  return { jobName: job.jobName, tasks };
}

import path from 'path';
import type { PlannedJob, PreparedJob, PreparedStep, PreparedTask, Task } from '../domain/Job';
import { inputPaths } from '../domain/Inputs';
import { prepareActionStep } from '../ffmpeg/actions';

function pathKey(file: string): string {
  const absolute = path.resolve(file);
  // Windows paths are case insensitive, so collision checks must be too.
  return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
}

function prepareTask(task: Task): PreparedTask {
  let currentKind: 'video' | 'audio' = 'video';
  const preparedSteps: PreparedStep[] = [];
  for (const [index, step] of task.steps.entries()) {
    const action = prepareActionStep(step);
    preparedSteps.push({ action: step.action, handler: action });
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
  const tasks: PreparedTask[] = [];
  for (const task of job.tasks) {
    const output = pathKey(task.outputFile);
    if (outputs.has(output)) throw new Error(`Multiple tasks would write to ${task.outputFile}`);
    outputs.add(output);
    if (inputs.has(output))
      throw new Error(`Output may overwrite an input file: ${task.outputFile}`);
    tasks.push(prepareTask(task));
  }
  return { jobName: job.jobName, tasks };
}

import { BaseStep } from './Step';
import type { JobSettings } from '../yaml/settings';
import type { PreparedActionStep } from '../ffmpeg/actions/action';
import type { TaskInputs } from './Inputs';

export interface Task {
  id: string;
  inputs: TaskInputs;
  outputFile: string;
  steps: BaseStep[];
  settings?: JobSettings;
  basename: string;
}

export interface PlannedJob {
  jobName: string;
  tasks: Task[];
}

export interface PreparedStep {
  action: string;
  handler: PreparedActionStep;
}

export interface PreparedTask extends Omit<Task, 'steps'> {
  steps: PreparedStep[];
}

export interface PreparedJob {
  jobName: string;
  tasks: PreparedTask[];
}

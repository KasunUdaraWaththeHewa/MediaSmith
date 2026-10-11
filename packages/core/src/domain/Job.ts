import { BaseStep } from './Step';
import type { JobSettings } from '../yaml/settings';

export interface Task {
  id: string;
  inputFiles: string[]; // [video] or [video, audio]
  outputFile: string;
  steps: BaseStep[];
  settings?: JobSettings;
  basename: string;
}

export interface PlannedJob {
  jobName: string;
  tasks: Task[];
}

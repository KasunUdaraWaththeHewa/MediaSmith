import { BaseStep } from './Step';

export interface Task {
  id: string;
  inputFiles: string[]; // [video] or [video, audio]
  outputFile: string;
  steps: BaseStep[];
  basename: string;
}

export interface PlannedJob {
  jobName: string;
  tasks: Task[];
}

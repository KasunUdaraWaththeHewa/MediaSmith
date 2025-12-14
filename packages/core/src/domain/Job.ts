import { Step } from './Step';

export interface Task {
  id: string;
  inputFiles: string[]; // [video] or [video, audio]
  outputFile: string;
  steps: Step[];
  basename: string;
}

export interface PlannedJob {
  jobName: string;
  tasks: Task[];
}

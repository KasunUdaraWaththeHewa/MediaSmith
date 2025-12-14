import { Step } from './Step';
export interface Task {
    id: string;
    inputFiles: string[];
    outputFile: string;
    steps: Step[];
    basename: string;
}
export interface PlannedJob {
    jobName: string;
    tasks: Task[];
}
//# sourceMappingURL=Job.d.ts.map
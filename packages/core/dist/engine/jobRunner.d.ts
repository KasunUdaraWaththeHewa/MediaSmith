import { JobConfigValidated } from '../yaml/schema';
export interface RunOptions {
    dryRun?: boolean;
    onLog?: (msg: string) => void;
}
export declare function runJobFromConfig(config: JobConfigValidated, opts?: RunOptions): Promise<void>;
//# sourceMappingURL=jobRunner.d.ts.map
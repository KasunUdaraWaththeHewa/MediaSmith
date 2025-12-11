import { BaseStep } from '../../domain/Step';
import { VideoProbeInfo } from '../ffprobe';
export interface StepContext {
    inputFiles: string[];
    outputFile: string;
    probe?: VideoProbeInfo;
}
export declare function buildArgsForStep(step: BaseStep, ctx: StepContext): string[];
//# sourceMappingURL=index.d.ts.map
import { BaseStep } from './Step';
export interface ForEachGlob {
    glob: string;
}
export interface ForEachPairs {
    video_pattern: string;
    audio_pattern: string;
    pair_by: 'basename';
}
export interface OutputPattern {
    directory: string;
    filename: string;
}
export interface JobConfig {
    version: number;
    job: {
        name: string;
        for_each?: ForEachGlob;
        for_each_pairs?: ForEachPairs;
        output: OutputPattern;
        steps: BaseStep[];
    };
}
//# sourceMappingURL=JobConfig.d.ts.map
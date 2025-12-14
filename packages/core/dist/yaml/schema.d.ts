import { z } from 'zod';
import { StepAction } from '../domain/Step';
export declare const StepSchema: z.ZodObject<{
    action: z.ZodEnum<[StepAction.CompressVideo, StepAction.MergeAudio, StepAction.ExtractAudio, StepAction.Trim, StepAction.NormalizeAudio, StepAction.DedupeMedia]>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    action: z.ZodEnum<[StepAction.CompressVideo, StepAction.MergeAudio, StepAction.ExtractAudio, StepAction.Trim, StepAction.NormalizeAudio, StepAction.DedupeMedia]>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    action: z.ZodEnum<[StepAction.CompressVideo, StepAction.MergeAudio, StepAction.ExtractAudio, StepAction.Trim, StepAction.NormalizeAudio, StepAction.DedupeMedia]>;
}, z.ZodTypeAny, "passthrough">>;
export declare const ForEachGlobSchema: z.ZodObject<{
    glob: z.ZodString;
}, "strip", z.ZodTypeAny, {
    glob: string;
}, {
    glob: string;
}>;
export declare const ForEachPairsSchema: z.ZodObject<{
    video_pattern: z.ZodString;
    audio_pattern: z.ZodString;
    pair_by: z.ZodEnum<["basename", "normalized_basename"]>;
    normalize: z.ZodOptional<z.ZodObject<{
        video: z.ZodOptional<z.ZodObject<{
            remove_prefix: z.ZodOptional<z.ZodString>;
            remove_suffix: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        }, {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        }>>;
        audio: z.ZodOptional<z.ZodObject<{
            remove_prefix: z.ZodOptional<z.ZodString>;
            remove_suffix: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        }, {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        video?: {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        } | undefined;
        audio?: {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        } | undefined;
    }, {
        video?: {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        } | undefined;
        audio?: {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    video_pattern: string;
    audio_pattern: string;
    pair_by: "basename" | "normalized_basename";
    normalize?: {
        video?: {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        } | undefined;
        audio?: {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        } | undefined;
    } | undefined;
}, {
    video_pattern: string;
    audio_pattern: string;
    pair_by: "basename" | "normalized_basename";
    normalize?: {
        video?: {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        } | undefined;
        audio?: {
            remove_prefix?: string | undefined;
            remove_suffix?: string | undefined;
        } | undefined;
    } | undefined;
}>;
export declare const OutputPatternSchema: z.ZodObject<{
    directory: z.ZodString;
    filename: z.ZodString;
}, "strip", z.ZodTypeAny, {
    directory: string;
    filename: string;
}, {
    directory: string;
    filename: string;
}>;
export declare const JobSchema: z.ZodObject<{
    version: z.ZodNumber;
    job: z.ZodObject<{
        name: z.ZodString;
        for_each: z.ZodOptional<z.ZodObject<{
            glob: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            glob: string;
        }, {
            glob: string;
        }>>;
        for_each_pairs: z.ZodOptional<z.ZodObject<{
            video_pattern: z.ZodString;
            audio_pattern: z.ZodString;
            pair_by: z.ZodEnum<["basename", "normalized_basename"]>;
            normalize: z.ZodOptional<z.ZodObject<{
                video: z.ZodOptional<z.ZodObject<{
                    remove_prefix: z.ZodOptional<z.ZodString>;
                    remove_suffix: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                }, {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                }>>;
                audio: z.ZodOptional<z.ZodObject<{
                    remove_prefix: z.ZodOptional<z.ZodString>;
                    remove_suffix: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                }, {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                video?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
                audio?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
            }, {
                video?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
                audio?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename" | "normalized_basename";
            normalize?: {
                video?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
                audio?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
            } | undefined;
        }, {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename" | "normalized_basename";
            normalize?: {
                video?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
                audio?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
            } | undefined;
        }>>;
        output: z.ZodObject<{
            directory: z.ZodString;
            filename: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            directory: string;
            filename: string;
        }, {
            directory: string;
            filename: string;
        }>;
        steps: z.ZodArray<z.ZodObject<{
            action: z.ZodEnum<[StepAction.CompressVideo, StepAction.MergeAudio, StepAction.ExtractAudio, StepAction.Trim, StepAction.NormalizeAudio, StepAction.DedupeMedia]>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            action: z.ZodEnum<[StepAction.CompressVideo, StepAction.MergeAudio, StepAction.ExtractAudio, StepAction.Trim, StepAction.NormalizeAudio, StepAction.DedupeMedia]>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            action: z.ZodEnum<[StepAction.CompressVideo, StepAction.MergeAudio, StepAction.ExtractAudio, StepAction.Trim, StepAction.NormalizeAudio, StepAction.DedupeMedia]>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        output: {
            directory: string;
            filename: string;
        };
        steps: z.objectOutputType<{
            action: z.ZodEnum<[StepAction.CompressVideo, StepAction.MergeAudio, StepAction.ExtractAudio, StepAction.Trim, StepAction.NormalizeAudio, StepAction.DedupeMedia]>;
        }, z.ZodTypeAny, "passthrough">[];
        for_each?: {
            glob: string;
        } | undefined;
        for_each_pairs?: {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename" | "normalized_basename";
            normalize?: {
                video?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
                audio?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    }, {
        name: string;
        output: {
            directory: string;
            filename: string;
        };
        steps: z.objectInputType<{
            action: z.ZodEnum<[StepAction.CompressVideo, StepAction.MergeAudio, StepAction.ExtractAudio, StepAction.Trim, StepAction.NormalizeAudio, StepAction.DedupeMedia]>;
        }, z.ZodTypeAny, "passthrough">[];
        for_each?: {
            glob: string;
        } | undefined;
        for_each_pairs?: {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename" | "normalized_basename";
            normalize?: {
                video?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
                audio?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    version: number;
    job: {
        name: string;
        output: {
            directory: string;
            filename: string;
        };
        steps: z.objectOutputType<{
            action: z.ZodEnum<[StepAction.CompressVideo, StepAction.MergeAudio, StepAction.ExtractAudio, StepAction.Trim, StepAction.NormalizeAudio, StepAction.DedupeMedia]>;
        }, z.ZodTypeAny, "passthrough">[];
        for_each?: {
            glob: string;
        } | undefined;
        for_each_pairs?: {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename" | "normalized_basename";
            normalize?: {
                video?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
                audio?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    };
}, {
    version: number;
    job: {
        name: string;
        output: {
            directory: string;
            filename: string;
        };
        steps: z.objectInputType<{
            action: z.ZodEnum<[StepAction.CompressVideo, StepAction.MergeAudio, StepAction.ExtractAudio, StepAction.Trim, StepAction.NormalizeAudio, StepAction.DedupeMedia]>;
        }, z.ZodTypeAny, "passthrough">[];
        for_each?: {
            glob: string;
        } | undefined;
        for_each_pairs?: {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename" | "normalized_basename";
            normalize?: {
                video?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
                audio?: {
                    remove_prefix?: string | undefined;
                    remove_suffix?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    };
}>;
export type JobConfigValidated = z.infer<typeof JobSchema>;
//# sourceMappingURL=schema.d.ts.map
import { z } from 'zod';
export declare const StepSchema: z.ZodObject<{
    action: z.ZodEnum<["compress_video", "merge_audio", "extract_audio", "trim", "normalize_audio", "dedupe_media"]>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    action: z.ZodEnum<["compress_video", "merge_audio", "extract_audio", "trim", "normalize_audio", "dedupe_media"]>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    action: z.ZodEnum<["compress_video", "merge_audio", "extract_audio", "trim", "normalize_audio", "dedupe_media"]>;
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
    pair_by: z.ZodLiteral<"basename">;
}, "strip", z.ZodTypeAny, {
    video_pattern: string;
    audio_pattern: string;
    pair_by: "basename";
}, {
    video_pattern: string;
    audio_pattern: string;
    pair_by: "basename";
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
            pair_by: z.ZodLiteral<"basename">;
        }, "strip", z.ZodTypeAny, {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename";
        }, {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename";
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
            action: z.ZodEnum<["compress_video", "merge_audio", "extract_audio", "trim", "normalize_audio", "dedupe_media"]>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            action: z.ZodEnum<["compress_video", "merge_audio", "extract_audio", "trim", "normalize_audio", "dedupe_media"]>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            action: z.ZodEnum<["compress_video", "merge_audio", "extract_audio", "trim", "normalize_audio", "dedupe_media"]>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        output: {
            directory: string;
            filename: string;
        };
        steps: z.objectOutputType<{
            action: z.ZodEnum<["compress_video", "merge_audio", "extract_audio", "trim", "normalize_audio", "dedupe_media"]>;
        }, z.ZodTypeAny, "passthrough">[];
        for_each?: {
            glob: string;
        } | undefined;
        for_each_pairs?: {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename";
        } | undefined;
    }, {
        name: string;
        output: {
            directory: string;
            filename: string;
        };
        steps: z.objectInputType<{
            action: z.ZodEnum<["compress_video", "merge_audio", "extract_audio", "trim", "normalize_audio", "dedupe_media"]>;
        }, z.ZodTypeAny, "passthrough">[];
        for_each?: {
            glob: string;
        } | undefined;
        for_each_pairs?: {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename";
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
            action: z.ZodEnum<["compress_video", "merge_audio", "extract_audio", "trim", "normalize_audio", "dedupe_media"]>;
        }, z.ZodTypeAny, "passthrough">[];
        for_each?: {
            glob: string;
        } | undefined;
        for_each_pairs?: {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename";
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
            action: z.ZodEnum<["compress_video", "merge_audio", "extract_audio", "trim", "normalize_audio", "dedupe_media"]>;
        }, z.ZodTypeAny, "passthrough">[];
        for_each?: {
            glob: string;
        } | undefined;
        for_each_pairs?: {
            video_pattern: string;
            audio_pattern: string;
            pair_by: "basename";
        } | undefined;
    };
}>;
export type JobConfigValidated = z.infer<typeof JobSchema>;
//# sourceMappingURL=schema.d.ts.map
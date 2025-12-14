"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobSchema = exports.OutputPatternSchema = exports.ForEachPairsSchema = exports.ForEachGlobSchema = exports.StepSchema = void 0;
const zod_1 = require("zod");
exports.StepSchema = zod_1.z.object({
    action: zod_1.z.enum([
        "compress_video" /* StepAction.CompressVideo */,
        "merge_audio" /* StepAction.MergeAudio */,
        "extract_audio" /* StepAction.ExtractAudio */,
        "trim" /* StepAction.Trim */,
        "normalize_audio" /* StepAction.NormalizeAudio */,
        "dedupe_media" /* StepAction.DedupeMedia */
    ])
    // .passthrough() allows extra fields depending on action
}).passthrough();
exports.ForEachGlobSchema = zod_1.z.object({
    glob: zod_1.z.string()
});
exports.ForEachPairsSchema = zod_1.z.object({
    video_pattern: zod_1.z.string(),
    audio_pattern: zod_1.z.string(),
    pair_by: zod_1.z.enum(['basename', 'normalized_basename']),
    normalize: zod_1.z.object({
        video: zod_1.z.object({
            remove_prefix: zod_1.z.string().optional(),
            remove_suffix: zod_1.z.string().optional()
        }).optional(),
        audio: zod_1.z.object({
            remove_prefix: zod_1.z.string().optional(),
            remove_suffix: zod_1.z.string().optional()
        }).optional()
    }).optional()
});
exports.OutputPatternSchema = zod_1.z.object({
    directory: zod_1.z.string(),
    filename: zod_1.z.string()
});
exports.JobSchema = zod_1.z.object({
    version: zod_1.z.number().int().min(1),
    job: zod_1.z.object({
        name: zod_1.z.string(),
        for_each: exports.ForEachGlobSchema.optional(),
        for_each_pairs: exports.ForEachPairsSchema.optional(),
        output: exports.OutputPatternSchema,
        steps: zod_1.z.array(exports.StepSchema).min(1)
    })
});

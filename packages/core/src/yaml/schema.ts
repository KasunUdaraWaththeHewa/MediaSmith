import { z } from 'zod';

export const StepSchema = z.object({
  action: z.enum([
    'compress_video',
    'merge_audio',
    'extract_audio',
    'trim',
    'normalize_audio',
    'dedupe_media'
  ])
  // .passthrough() allows extra fields depending on action
}).passthrough();

export const ForEachGlobSchema = z.object({
  glob: z.string()
});

export const ForEachPairsSchema = z.object({
  video_pattern: z.string(),
  audio_pattern: z.string(),
  pair_by: z.literal('basename')
});

export const OutputPatternSchema = z.object({
  directory: z.string(),
  filename: z.string()
});

export const JobSchema = z.object({
  version: z.number().int().min(1),
  job: z.object({
    name: z.string(),
    for_each: ForEachGlobSchema.optional(),
    for_each_pairs: ForEachPairsSchema.optional(),
    output: OutputPatternSchema,
    steps: z.array(StepSchema).min(1)
  })
});

export type JobConfigValidated = z.infer<typeof JobSchema>;

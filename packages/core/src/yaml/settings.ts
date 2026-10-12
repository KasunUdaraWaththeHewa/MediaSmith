import { z } from 'zod';

export const PositiveInteger = z.number().int().positive().finite();
export const MaxWidthSchema = PositiveInteger.min(2);
export const NonnegativeNumber = z.number().finite().nonnegative();

export const PresetSchema = z.enum([
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'veryslow'
]);

export const QualitySchema = z.enum(['low', 'medium', 'high']);

const QualitySettingsSchema = z
  .object({
    crf: z.number().int().min(0).max(51).optional(),
    bitrate_factor: z.number().finite().positive().optional()
  })
  .strict();

export const VideoProfileSchema = z
  .object({
    max_width: MaxWidthSchema.optional(),
    video_bitrate_kbps: PositiveInteger.optional()
  })
  .strict();

const CompressSettingsSchema = z
  .object({
    preset: PresetSchema.optional(),
    audio_bitrate_kbps: PositiveInteger.optional(),
    default_video_bitrate_kbps: PositiveInteger.optional(),
    container_overhead_percent: z.number().finite().min(0).max(50).optional(),
    minimum_video_bitrate_kbps: PositiveInteger.optional(),
    quality: z
      .object({
        low: QualitySettingsSchema.optional(),
        medium: QualitySettingsSchema.optional(),
        high: QualitySettingsSchema.optional()
      })
      .strict()
      .optional(),
    profiles: z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/), VideoProfileSchema).optional()
  })
  .strict();

const MergeSettingsSchema = z
  .object({
    audio_bitrate_kbps: PositiveInteger.optional(),
    original_volume: NonnegativeNumber.optional(),
    external_volume: NonnegativeNumber.optional()
  })
  .strict();

const ExtractSettingsSchema = z
  .object({
    mp3_quality_bitrates_kbps: z
      .object({
        low: PositiveInteger.optional(),
        medium: PositiveInteger.optional(),
        high: PositiveInteger.optional()
      })
      .strict()
      .optional()
  })
  .strict();

export const JobSettingsSchema = z
  .object({
    compress_video: CompressSettingsSchema.optional(),
    merge_audio: MergeSettingsSchema.optional(),
    extract_audio: ExtractSettingsSchema.optional()
  })
  .strict();

export type JobSettings = z.infer<typeof JobSettingsSchema>;

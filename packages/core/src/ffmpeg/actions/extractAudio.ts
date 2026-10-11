import { z } from 'zod';
import { defineAction } from './action';
import { DEFAULT_SETTINGS } from './defaults';
import type { JobSettings } from '../../yaml/settings';

export const ExtractAudioSchema = z
  .object({
    action: z.literal('extract_audio'),
    format: z.enum(['mp3', 'wav', 'flac']),
    quality: z.enum(['low', 'medium', 'high']).optional(),
    bitrate: z
      .string()
      .regex(/^[1-9]\d*k$/)
      .optional()
  })
  .strict()
  .superRefine((step, context) => {
    if (step.format !== 'mp3' && (step.quality || step.bitrate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'quality and bitrate apply only to MP3 output'
      });
    }
    if (step.quality && step.bitrate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Specify either quality or bitrate, not both'
      });
    }
  });

type ExtractAudioStep = z.infer<typeof ExtractAudioSchema>;

export function buildExtractAudioArgs(
  step: ExtractAudioStep,
  inputFile: string,
  outputFile: string,
  settings: NonNullable<JobSettings['extract_audio']> = {}
): string[] {
  const args = ['-hide_banner', '-y', '-i', inputFile, '-vn', '-map', '0:a:0'];
  if (step.format === 'mp3') {
    const quality = step.quality ?? 'medium';
    const qualityBitrate =
      settings.mp3_quality_bitrates_kbps?.[quality] ??
      DEFAULT_SETTINGS.extract_audio.mp3_quality_bitrates_kbps[quality];
    args.push('-c:a', 'libmp3lame', '-b:a', step.bitrate ?? `${qualityBitrate}k`);
  } else if (step.format === 'wav') {
    args.push('-c:a', 'pcm_s16le');
  } else {
    args.push('-c:a', 'flac');
  }
  args.push(outputFile);
  return args;
}

export const extractAudioAction = defineAction(
  ExtractAudioSchema,
  (step, context) => {
    if (!context.inputFiles[0]) throw new Error('extract_audio requires a media input');
    return buildExtractAudioArgs(
      step,
      context.inputFiles[0],
      context.outputFile,
      context.settings?.extract_audio
    );
  },
  {
    inputKind: 'video',
    outputKind: 'audio',
    outputExtensions: (step) => [`.${step.format}`],
    defaultExtension: (step) => `.${step.format}`
  }
);

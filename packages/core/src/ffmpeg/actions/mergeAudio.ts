import { z } from 'zod';
import { defineAction } from './action';
import { VIDEO_EXTENSIONS } from './formats';
import { DEFAULT_SETTINGS } from './defaults';
import { JobSettings, PositiveInteger } from '../../yaml/settings';

export const MergeAudioSchema = z
  .object({
    action: z.literal('merge_audio'),
    audio_source: z.enum(['external_only', 'mix']),
    original_volume: z.number().finite().nonnegative().optional(),
    external_volume: z.number().finite().nonnegative().optional(),
    audio_bitrate_kbps: PositiveInteger.optional()
  })
  .strict()
  .superRefine((step, context) => {
    if (
      step.audio_source === 'external_only' &&
      (step.original_volume !== undefined || step.external_volume !== undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Volume options require audio_source: mix'
      });
    }
  });

export type MergeAudioStep = z.infer<typeof MergeAudioSchema>;

export function buildMergeAudioArgs(
  step: MergeAudioStep,
  videoPath: string,
  audioPath: string,
  outputFile: string,
  settings: NonNullable<JobSettings['merge_audio']> = {}
): string[] {
  const args: string[] = ['-hide_banner', '-y', '-i', videoPath, '-i', audioPath];
  const audioBitrate =
    step.audio_bitrate_kbps ??
    settings.audio_bitrate_kbps ??
    DEFAULT_SETTINGS.merge_audio.audio_bitrate_kbps;

  if (step.audio_source === 'external_only') {
    args.push(
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      `${audioBitrate}k`,
      outputFile
    );
    return args;
  }

  const origVol =
    step.original_volume ??
    settings.original_volume ??
    DEFAULT_SETTINGS.merge_audio.original_volume;
  const extVol =
    step.external_volume ??
    settings.external_volume ??
    DEFAULT_SETTINGS.merge_audio.external_volume;

  args.push(
    '-filter_complex',
    `[0:a]volume=${origVol}[a0];[1:a]volume=${extVol}[a1];[a0][a1]amix=inputs=2:normalize=1[aout]`,
    '-map',
    '0:v:0',
    '-map',
    '[aout]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    `${audioBitrate}k`,
    outputFile
  );

  return args;
}

export const mergeAudioAction = defineAction(
  MergeAudioSchema,
  (step, context) => {
    if (!context.inputs.primary || !context.inputs.externalAudio) {
      throw new Error('merge_audio requires a video and external audio input');
    }
    return buildMergeAudioArgs(
      step,
      context.inputs.primary,
      context.inputs.externalAudio,
      context.outputFile,
      context.settings?.merge_audio
    );
  },
  {
    inputKind: 'video',
    outputKind: 'video',
    outputExtensions: () => VIDEO_EXTENSIONS,
    defaultExtension: () => '.mp4',
    needsExternalAudio: true,
    estimateProbe: (_step, probe) => ({ ...probe, hasAudio: true })
  }
);

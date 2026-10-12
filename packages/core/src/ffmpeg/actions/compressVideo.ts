import fs from 'fs';
import type { VideoProbeInfo } from '../ffprobe';
import { z } from 'zod';
import { defineAction } from './action';
import { VIDEO_EXTENSIONS } from './formats';
import { outputDimensions, targetVideoBitrateKbps } from './compressionMath';
import { resolveCompressionSettings, validateCompressionProfile } from './compressionSettings';
import { PositiveInteger, PresetSchema, QualitySchema } from '../../yaml/settings';
import type { JobSettings } from '../../yaml/settings';

export const CompressVideoSchema = z
  .object({
    action: z.literal('compress_video'),
    profile: z.string().min(1).optional(),
    quality: QualitySchema.optional(),
    max_size_mb: z.number().finite().positive().optional(),
    max_width: PositiveInteger.optional(),
    video_bitrate_kbps: PositiveInteger.optional(),
    audio_bitrate_kbps: PositiveInteger.optional(),
    preset: PresetSchema.optional()
  })
  .strict();

export type CompressVideoStep = z.infer<typeof CompressVideoSchema>;

type CompressionSettings = NonNullable<JobSettings['compress_video']>;

async function validateCompressedOutput(
  step: CompressVideoStep,
  outputFile: string
): Promise<void> {
  if (step.max_size_mb === undefined) return;

  const actualBytes = (await fs.promises.stat(outputFile)).size;
  const limitBytes = step.max_size_mb * 1024 * 1024;
  if (actualBytes > limitBytes) {
    throw new Error(
      `Output is ${(actualBytes / 1024 / 1024).toFixed(2)} MB, above max_size_mb=${step.max_size_mb}. ` +
        'Try a larger limit or shorter input'
    );
  }
}

export function buildCompressVideoArgs(
  step: CompressVideoStep,
  inputFile: string,
  outputFile: string,
  probe: VideoProbeInfo,
  settings: CompressionSettings = {}
): string[] {
  if (
    !Number.isFinite(probe.width) ||
    !Number.isFinite(probe.height) ||
    probe.width <= 0 ||
    probe.height <= 0
  ) {
    throw new Error(`compress_video requires a video stream with known dimensions: ${inputFile}`);
  }
  if (step.max_size_mb !== undefined && (!Number.isFinite(probe.duration) || probe.duration <= 0)) {
    throw new Error(`max_size_mb requires a known positive duration: ${inputFile}`);
  }
  const resolved = resolveCompressionSettings(step, settings);
  const args = ['-hide_banner', '-y', '-i', inputFile];
  const dimensions = outputDimensions(probe, resolved.maxWidth);
  if (dimensions.filter) args.push('-vf', dimensions.filter);

  args.push('-c:v', 'libx264', '-preset', resolved.preset);

  if (step.max_size_mb && probe.duration > 0) {
    args.push('-b:v', `${targetVideoBitrateKbps(step.max_size_mb, probe, resolved)}k`);
  } else {
    args.push('-crf', String(resolved.qualityCrf));
  }

  args.push('-c:a', 'aac', '-b:a', `${resolved.audioBitrateKbps}k`);
  args.push(outputFile);

  return args;
}

export const compressVideoAction = defineAction(
  CompressVideoSchema,
  (step, context) => {
    if (!context.probe || !context.inputs.primary) {
      throw new Error('compress_video requires a video input and probe data');
    }
    return buildCompressVideoArgs(
      step,
      context.inputs.primary,
      context.outputFile,
      context.probe,
      context.settings?.compress_video
    );
  },
  {
    inputKind: 'video',
    outputKind: 'video',
    outputExtensions: () => VIDEO_EXTENSIONS,
    defaultExtension: () => '.mp4',
    needsProbe: true,
    validateJobStep: validateCompressionProfile,
    validateOutput: validateCompressedOutput,
    estimateProbe: (step, probe, settings) => {
      const resolved = resolveCompressionSettings(step, settings?.compress_video);
      const dimensions = outputDimensions(probe, resolved.maxWidth);
      return { ...probe, width: dimensions.width, height: dimensions.height };
    }
  }
);

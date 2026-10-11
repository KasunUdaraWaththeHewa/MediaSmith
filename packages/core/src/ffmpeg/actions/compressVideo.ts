import fs from 'fs';
import type { VideoProbeInfo } from '../ffprobe';
import { z } from 'zod';
import { defineAction } from './action';
import type { ActionValidationIssue } from './action';
import { VIDEO_EXTENSIONS } from './formats';
import { DEFAULT_SETTINGS } from './defaults';
import { PositiveInteger, PresetSchema } from '../../yaml/settings';
import type { JobSettings } from '../../yaml/settings';

export const CompressVideoSchema = z.object({
  action: z.literal('compress_video'),
  profile: z.string().min(1).optional(),
  quality: z.enum(['low', 'medium', 'high']).optional(),
  max_size_mb: z.number().finite().positive().optional(),
  max_width: PositiveInteger.optional(),
  video_bitrate_kbps: PositiveInteger.optional(),
  audio_bitrate_kbps: PositiveInteger.optional(),
  preset: PresetSchema.optional()
}).strict();

export type CompressVideoStep = z.infer<typeof CompressVideoSchema>;

type Quality = 'low' | 'medium' | 'high';

function qualityToCrf(q: Quality | undefined): number {
  if (!q) return 23;
  if (q === 'high') return 20;
  if (q === 'low') return 28;
  return 23;
}

type CompressionSettings = NonNullable<JobSettings['compress_video']>;
type VideoProfile = { max_width?: number; video_bitrate_kbps?: number };

function getProfile(profiles: Record<string, VideoProfile> | undefined, name: string | undefined): VideoProfile | undefined {
  return name && profiles && Object.prototype.hasOwnProperty.call(profiles, name)
    ? profiles[name]
    : undefined;
}

function validateCompressionProfile(step: CompressVideoStep, settings?: JobSettings): ActionValidationIssue | undefined {
  if (!step.profile) return undefined;
  const builtin = getProfile(DEFAULT_SETTINGS.compress_video.profiles, step.profile);
  const configured = getProfile(settings?.compress_video?.profiles, step.profile);
  return builtin || configured
    ? undefined
    : { path: ['profile'], message: `Unknown compression profile: ${step.profile}` };
}

function resolveCompressionSettings(step: CompressVideoStep, settings: CompressionSettings) {
  const builtinProfile = getProfile(DEFAULT_SETTINGS.compress_video.profiles, step.profile);
  const configuredProfile = getProfile(settings.profiles, step.profile);
  const profileError = validateCompressionProfile(step, { compress_video: settings });
  if (profileError) throw new Error(profileError.message);

  return {
    maxWidth: step.max_width ?? configuredProfile?.max_width ?? builtinProfile?.max_width,
    videoBitrateKbps: step.video_bitrate_kbps
      ?? configuredProfile?.video_bitrate_kbps
      ?? builtinProfile?.video_bitrate_kbps
      ?? settings.default_video_bitrate_kbps
      ?? DEFAULT_SETTINGS.compress_video.default_video_bitrate_kbps,
    audioBitrateKbps: step.audio_bitrate_kbps
      ?? settings.audio_bitrate_kbps
      ?? DEFAULT_SETTINGS.compress_video.audio_bitrate_kbps,
    preset: step.preset ?? settings.preset ?? DEFAULT_SETTINGS.compress_video.preset,
    overheadPercent: settings.container_overhead_percent
      ?? DEFAULT_SETTINGS.compress_video.container_overhead_percent,
    minimumVideoKbps: settings.minimum_video_bitrate_kbps
      ?? DEFAULT_SETTINGS.compress_video.minimum_video_bitrate_kbps
  };
}

async function validateCompressedOutput(step: CompressVideoStep, outputFile: string): Promise<void> {
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
  if (!Number.isFinite(probe.width) || !Number.isFinite(probe.height) || probe.width <= 0 || probe.height <= 0) {
    throw new Error(`compress_video requires a video stream with known dimensions: ${inputFile}`);
  }
  if (step.max_size_mb !== undefined && (!Number.isFinite(probe.duration) || probe.duration <= 0)) {
    throw new Error(`max_size_mb requires a known positive duration: ${inputFile}`);
  }
  const resolved = resolveCompressionSettings(step, settings);
  const args = ['-hide_banner', '-y', '-i', inputFile];
  const width = resolved.maxWidth ? Math.min(probe.width, resolved.maxWidth) : probe.width;

  const bitrateFactor = step.quality === 'low' ? 0.75 : step.quality === 'high' ? 1.6 : 1;
  let targetBitrateK = Math.round(resolved.videoBitrateKbps * bitrateFactor);

  const evenWidth = Math.max(2, Math.floor(width / 2) * 2);
  if (width && (evenWidth !== probe.width || probe.height % 2 !== 0)) {
    args.push('-vf', `scale=${evenWidth}:-2`);
  }

  args.push('-c:v', 'libx264', '-preset', resolved.preset);

  if (step.max_size_mb && probe.duration > 0) {
    const bits = step.max_size_mb * 1024 * 1024 * 8;
    const totalKbps = Math.floor(bits / probe.duration / 1000);
    const audioKbps = probe.hasAudio === false ? 0 : resolved.audioBitrateKbps;
    const videoKbps = Math.floor(totalKbps * (1 - resolved.overheadPercent / 100)) - audioKbps;
    if (videoKbps < resolved.minimumVideoKbps) {
      throw new Error(`max_size_mb=${step.max_size_mb} is too small for ${probe.duration}s of video and audio`);
    }
    targetBitrateK = Math.min(targetBitrateK, videoKbps);
    args.push('-b:v', `${targetBitrateK}k`);
  } else {
    const crf = qualityToCrf(step.quality);
    args.push('-crf', String(crf));
  }

  args.push('-c:a', 'aac', '-b:a', `${resolved.audioBitrateKbps}k`);
  args.push(outputFile);

  return args;
}

export const compressVideoAction = defineAction(
  CompressVideoSchema,
  (step, context) => {
    if (!context.probe || !context.inputFiles[0]) {
      throw new Error('compress_video requires a video input and probe data');
    }
    return buildCompressVideoArgs(step, context.inputFiles[0], context.outputFile, context.probe, context.settings?.compress_video);
  },
  {
    inputKind: 'video',
    outputKind: 'video',
    outputExtensions: () => VIDEO_EXTENSIONS,
    defaultExtension: () => '.mp4',
    needsProbe: true,
    validateJobStep: validateCompressionProfile,
    validateOutput: validateCompressedOutput
  }
);

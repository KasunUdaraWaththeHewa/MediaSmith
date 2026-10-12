import type { JobSettings } from '../../yaml/settings';
import type { ActionValidationIssue } from './action';
import type { CompressVideoStep } from './compressVideo';
import { DEFAULT_SETTINGS } from './defaults';

type CompressionSettings = NonNullable<JobSettings['compress_video']>;
type VideoProfile = { max_width?: number; video_bitrate_kbps?: number };

export interface ResolvedCompressionSettings {
  maxWidth?: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  preset: string;
  overheadPercent: number;
  minimumVideoKbps: number;
  qualityCrf: number;
  qualityBitrateFactor: number;
}

function getProfile(
  profiles: Record<string, VideoProfile> | undefined,
  name: string | undefined
): VideoProfile | undefined {
  return name && profiles && Object.prototype.hasOwnProperty.call(profiles, name)
    ? profiles[name]
    : undefined;
}

export function validateCompressionProfile(
  step: CompressVideoStep,
  settings?: JobSettings
): ActionValidationIssue | undefined {
  if (!step.profile) return undefined;
  const builtin = getProfile(DEFAULT_SETTINGS.compress_video.profiles, step.profile);
  const configured = getProfile(settings?.compress_video?.profiles, step.profile);
  return builtin || configured
    ? undefined
    : { path: ['profile'], message: `Unknown compression profile: ${step.profile}` };
}

export function resolveCompressionSettings(
  step: CompressVideoStep,
  settings: CompressionSettings = {}
): ResolvedCompressionSettings {
  const profileError = validateCompressionProfile(step, { compress_video: settings });
  if (profileError) throw new Error(profileError.message);

  const builtinProfile = getProfile(DEFAULT_SETTINGS.compress_video.profiles, step.profile);
  const configuredProfile = getProfile(settings.profiles, step.profile);
  const quality = step.quality ?? 'medium';
  const qualitySettings = settings.quality?.[quality];
  const builtinQuality = DEFAULT_SETTINGS.compress_video.quality[quality];

  // Step values take priority over named profiles, job defaults, and built-in defaults.
  return {
    maxWidth: step.max_width ?? configuredProfile?.max_width ?? builtinProfile?.max_width,
    videoBitrateKbps:
      step.video_bitrate_kbps ??
      configuredProfile?.video_bitrate_kbps ??
      builtinProfile?.video_bitrate_kbps ??
      settings.default_video_bitrate_kbps ??
      DEFAULT_SETTINGS.compress_video.default_video_bitrate_kbps,
    audioBitrateKbps:
      step.audio_bitrate_kbps ??
      settings.audio_bitrate_kbps ??
      DEFAULT_SETTINGS.compress_video.audio_bitrate_kbps,
    preset: step.preset ?? settings.preset ?? DEFAULT_SETTINGS.compress_video.preset,
    overheadPercent:
      settings.container_overhead_percent ??
      DEFAULT_SETTINGS.compress_video.container_overhead_percent,
    minimumVideoKbps:
      settings.minimum_video_bitrate_kbps ??
      DEFAULT_SETTINGS.compress_video.minimum_video_bitrate_kbps,
    qualityCrf: qualitySettings?.crf ?? builtinQuality.crf,
    qualityBitrateFactor: qualitySettings?.bitrate_factor ?? builtinQuality.bitrate_factor
  };
}

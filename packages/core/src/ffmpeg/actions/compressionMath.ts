import type { VideoProbeInfo } from '../ffprobe';
import type { ResolvedCompressionSettings } from './compressionSettings';

export interface OutputDimensions {
  width: number;
  height: number;
  filter?: string;
}

export function outputDimensions(probe: VideoProbeInfo, maxWidth?: number): OutputDimensions {
  const requestedWidth = maxWidth ? Math.min(probe.width, maxWidth) : probe.width;
  const width = Math.max(2, Math.floor(requestedWidth / 2) * 2);
  if (width === probe.width && probe.height % 2 === 0) {
    return { width: probe.width, height: probe.height };
  }

  const scaledHeight = Math.max(2, Math.round((probe.height * width) / probe.width / 2) * 2);
  return { width, height: scaledHeight, filter: `scale=${width}:-2` };
}

export function targetVideoBitrateKbps(
  maxSizeMb: number,
  probe: VideoProbeInfo,
  settings: ResolvedCompressionSettings
): number {
  const totalKbps = Math.floor((maxSizeMb * 1024 * 1024 * 8) / probe.duration / 1000);
  const audioKbps = probe.hasAudio === false ? 0 : settings.audioBitrateKbps;
  const availableVideoKbps =
    Math.floor(totalKbps * (1 - settings.overheadPercent / 100)) - audioKbps;
  if (availableVideoKbps < settings.minimumVideoKbps) {
    throw new Error(
      `max_size_mb=${maxSizeMb} is too small for ${probe.duration}s of video and audio`
    );
  }

  const qualityTarget = Math.round(settings.videoBitrateKbps * settings.qualityBitrateFactor);
  return Math.min(qualityTarget, availableVideoKbps);
}

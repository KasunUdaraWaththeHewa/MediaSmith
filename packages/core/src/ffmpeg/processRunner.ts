import { runFfmpeg } from './executor';
import type { ExecOptions } from './executor';
import { ffprobeVideo } from './ffprobe';
import type { ProbeOptions, VideoProbeInfo } from './ffprobe';

// Keep process invocation replaceable so the engine can test failures and cancellation.
export interface MediaProcessRunner {
  runFfmpeg(args: string[], options: ExecOptions): Promise<void>;
  probeVideo(file: string, options: ProbeOptions): Promise<VideoProbeInfo>;
}

export const defaultMediaProcessRunner: MediaProcessRunner = {
  runFfmpeg,
  probeVideo: ffprobeVideo
};

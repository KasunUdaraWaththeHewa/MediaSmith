import { spawn } from 'child_process';
import { z } from 'zod';
import { errorMessage, MediaSmithError } from '../errors';
import { waitForProcess } from './terminateProcess';

export interface VideoProbeInfo {
  duration: number; // seconds
  width: number;
  height: number;
  hasAudio?: boolean;
}

export interface ProbeOptions {
  signal?: AbortSignal;
}

const ProbeResultSchema = z
  .object({
    streams: z
      .array(
        z
          .object({
            codec_type: z.string().optional(),
            width: z.number().int().nonnegative().optional(),
            height: z.number().int().nonnegative().optional()
          })
          .passthrough()
      )
      .optional(),
    format: z
      .object({ duration: z.union([z.string(), z.number()]).optional() })
      .passthrough()
      .optional()
  })
  .passthrough();

export function parseProbeOutput(output: string): VideoProbeInfo {
  const parsed = ProbeResultSchema.safeParse(JSON.parse(output));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Invalid ffprobe metadata at ${issue.path.join('.')}: ${issue.message}`);
  }
  const result = parsed.data;
  const rawDuration = result.format?.duration;
  const duration = rawDuration === undefined || rawDuration === 'N/A' ? 0 : Number(rawDuration);
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error('ffprobe returned an invalid duration');
  }
  const streams = result.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === 'video');
  return {
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    duration,
    hasAudio: streams.some((stream) => stream.codec_type === 'audio')
  };
}

export async function ffprobeVideo(
  file: string,
  options: ProbeOptions = {}
): Promise<VideoProbeInfo> {
  options.signal?.throwIfAborted();
  const args = [
    '-v',
    'error',
    '-show_entries',
    'stream=codec_type,width,height:format=duration',
    '-of',
    'json',
    file
  ];

  const child = spawn('ffprobe', args);
  let out = '';
  let err = '';
  child.stdout.on('data', (data) => (out += data.toString()));
  child.stderr.on('data', (data) => (err += data.toString()));

  const completion = await waitForProcess(child, options.signal);
  if (completion.aborted) {
    throw new MediaSmithError(
      'PROCESS',
      'ffprobe cancelled',
      { command: 'ffprobe' },
      completion.error
    );
  }
  if (completion.error) {
    throw new MediaSmithError(
      'PROCESS',
      `Could not start ffprobe: ${errorMessage(completion.error)}`,
      { command: 'ffprobe' },
      completion.error
    );
  }
  if (completion.code !== 0) {
    throw new MediaSmithError('PROCESS', err || `ffprobe exited with ${completion.code}`, {
      command: 'ffprobe',
      exitCode: completion.code
    });
  }

  try {
    return parseProbeOutput(out);
  } catch (error) {
    throw new MediaSmithError(
      'PROCESS',
      `Could not parse ffprobe output for ${file}: ${errorMessage(error)}`,
      { command: 'ffprobe' },
      error
    );
  }
}

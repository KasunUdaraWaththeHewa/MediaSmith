import { spawn } from 'child_process';
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
    const result = JSON.parse(out) as {
      streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
      format?: { duration?: string };
    };
    const streams = result.streams ?? [];
    const video = streams.find((stream) => stream.codec_type === 'video');
    return {
      width: video?.width ?? 0,
      height: video?.height ?? 0,
      duration: Number(result.format?.duration ?? 0),
      hasAudio: streams.some((stream) => stream.codec_type === 'audio')
    };
  } catch (error) {
    throw new MediaSmithError(
      'PROCESS',
      `Could not parse ffprobe output for ${file}: ${errorMessage(error)}`,
      { command: 'ffprobe' },
      error
    );
  }
}

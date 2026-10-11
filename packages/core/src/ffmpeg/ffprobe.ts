import { spawn } from 'child_process';
import { errorMessage, MediaSmithError } from '../errors';

export interface VideoProbeInfo {
  duration: number; // seconds
  width: number;
  height: number;
  hasAudio?: boolean;
}

export function ffprobeVideo(file: string): Promise<VideoProbeInfo> {
  return new Promise((resolve, reject) => {
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
    child.on('error', (error) =>
      reject(
        new MediaSmithError(
          'PROCESS',
          `Could not start ffprobe: ${errorMessage(error)}`,
          { command: 'ffprobe' },
          error
        )
      )
    );
    let out = '';
    let err = '';

    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));

    child.on('close', (code) => {
      if (code !== 0)
        return reject(
          new MediaSmithError('PROCESS', err || `ffprobe exited with ${code}`, {
            command: 'ffprobe',
            exitCode: code
          })
        );

      try {
        const result = JSON.parse(out) as {
          streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
          format?: { duration?: string };
        };
        const streams = result.streams ?? [];
        const video = streams.find((stream) => stream.codec_type === 'video');
        resolve({
          width: video?.width ?? 0,
          height: video?.height ?? 0,
          duration: Number(result.format?.duration ?? 0),
          hasAudio: streams.some((stream) => stream.codec_type === 'audio')
        });
      } catch (error) {
        reject(
          new MediaSmithError(
            'PROCESS',
            `Could not parse ffprobe output for ${file}: ${errorMessage(error)}`,
            { command: 'ffprobe' },
            error
          )
        );
      }
    });
  });
}

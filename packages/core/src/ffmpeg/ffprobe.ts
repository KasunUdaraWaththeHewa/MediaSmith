import { spawn } from 'child_process';

export interface VideoProbeInfo {
  duration: number; // seconds
  width: number;
  height: number;
}

export function ffprobeVideo(file: string): Promise<VideoProbeInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=0',
      file
    ];

    const child = spawn('ffprobe', args);
    let out = '';
    let err = '';

    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());

    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `ffprobe exited with ${code}`));

      const lines = out.trim().split('\n');
      let width = 0, height = 0, duration = 0;
      for (const line of lines) {
        const [k, v] = line.split('=');
        if (k === 'width') width = Number(v);
        if (k === 'height') height = Number(v);
        if (k === 'duration') duration = Number(v);
      }
      resolve({ width, height, duration });
    });
  });
}

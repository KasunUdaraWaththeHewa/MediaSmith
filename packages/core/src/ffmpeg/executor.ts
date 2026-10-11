import { spawn } from 'child_process';
import { errorMessage, MediaSmithError } from '../errors';

export interface ExecOptions {
  dryRun?: boolean;
  onLog?: (line: string) => void;
}

export function runFfmpeg(args: string[], opts: ExecOptions = {}): Promise<void> {
  if (opts.dryRun) {
    opts.onLog?.(`ffmpeg ${args.map((a) => JSON.stringify(a)).join(' ')}`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let errorTail = '';

    child.on('error', (error) =>
      reject(
        new MediaSmithError(
          'PROCESS',
          `Could not start ffmpeg: ${errorMessage(error)}`,
          { command: 'ffmpeg' },
          error
        )
      )
    );

    child.stdout.on('data', (d) => opts.onLog?.(d.toString().trim()));
    child.stderr.on('data', (d) => {
      const chunk = d.toString();
      errorTail = (errorTail + chunk).slice(-2000);
      opts.onLog?.(chunk.trim());
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new MediaSmithError('PROCESS', `ffmpeg exited with code ${code}: ${errorTail.trim()}`, {
            command: 'ffmpeg',
            exitCode: code
          })
        );
    });
  });
}

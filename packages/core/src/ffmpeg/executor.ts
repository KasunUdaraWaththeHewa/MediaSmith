import { spawn } from 'child_process';

export interface ExecOptions {
  dryRun?: boolean;
  onLog?: (line: string) => void;
}

export function runFfmpeg(args: string[], opts: ExecOptions = {}): Promise<void> {
  if (opts.dryRun) {
    opts.onLog?.(`ffmpeg ${args.map(a => JSON.stringify(a)).join(' ')}`);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    child.stdout.on('data', d => opts.onLog?.(d.toString().trim()));
    child.stderr.on('data', d => opts.onLog?.(d.toString().trim()));

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

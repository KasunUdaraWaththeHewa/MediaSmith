import { spawn } from 'child_process';
import { errorMessage, MediaSmithError } from '../errors';
import { waitForProcess } from './terminateProcess';

export interface ExecOptions {
  dryRun?: boolean;
  onLog?: (line: string) => void;
  signal?: AbortSignal;
}

export async function runFfmpeg(args: string[], opts: ExecOptions = {}): Promise<void> {
  opts.signal?.throwIfAborted();
  if (opts.dryRun) {
    opts.onLog?.(`ffmpeg ${args.map((a) => JSON.stringify(a)).join(' ')}`);
    return;
  }

  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let errorTail = '';
  child.stdout.on('data', (data) => opts.onLog?.(data.toString().trim()));
  child.stderr.on('data', (data) => {
    const chunk = data.toString();
    errorTail = (errorTail + chunk).slice(-2000);
    opts.onLog?.(chunk.trim());
  });

  const completion = await waitForProcess(child, opts.signal);
  if (completion.aborted) {
    throw new MediaSmithError(
      'PROCESS',
      'ffmpeg cancelled',
      { command: 'ffmpeg' },
      completion.error
    );
  }
  if (completion.error) {
    throw new MediaSmithError(
      'PROCESS',
      `Could not start ffmpeg: ${errorMessage(completion.error)}`,
      { command: 'ffmpeg' },
      completion.error
    );
  }
  if (completion.code !== 0) {
    throw new MediaSmithError(
      'PROCESS',
      `ffmpeg exited with code ${completion.code}: ${errorTail.trim()}`,
      {
        command: 'ffmpeg',
        exitCode: completion.code
      }
    );
  }
}

import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

export interface ProcessCompletion {
  code: number | null;
  error?: Error;
  aborted: boolean;
}

export function waitForProcess(
  child: ChildProcess,
  signal?: AbortSignal
): Promise<ProcessCompletion> {
  return new Promise((resolve) => {
    let error: Error | undefined;
    let aborted = false;
    const stopChild = () => {
      if (aborted) return;
      aborted = true;
      terminateProcessTree(child);
    };

    child.on('error', (cause) => {
      error = cause;
    });
    // Wait for close so temporary-file cleanup cannot race a still-running encoder.
    child.on('close', (code) => {
      signal?.removeEventListener('abort', stopChild);
      resolve({ code, error, aborted });
    });

    signal?.addEventListener('abort', stopChild, { once: true });
    if (signal?.aborted) stopChild();
  });
}

export function terminateProcessTree(child: ChildProcess): void {
  if (process.platform !== 'win32' || child.pid === undefined) {
    child.kill('SIGKILL');
    return;
  }

  // Windows package managers may launch ffmpeg through a shim process.
  const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
    stdio: 'ignore',
    windowsHide: true
  });
  killer.on('error', () => child.kill('SIGKILL'));
  killer.on('close', (code) => {
    if (code !== 0) child.kill('SIGKILL');
  });
}

import type { ExecOptions } from '../ffmpeg/executor';
import type { MediaProcessRunner } from '../ffmpeg/processRunner';

export interface RunOptions extends ExecOptions {
  processRunner?: MediaProcessRunner;
}

import fg from 'fast-glob';
import path from 'path';
import { JobConfigValidated } from '../yaml/schema';
import { PlannedJob, Task } from '../domain/Job';
import crypto from 'crypto';

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function substituteFilename(pattern: string, params: { basename: string; ext: string }): string {
  return pattern
    .replace('{basename}', params.basename)
    .replace('{ext}', params.ext);
}

export async function planJob(config: JobConfigValidated): Promise<PlannedJob> {
  const { job } = config;

  if (job.for_each && job.for_each_pairs) {
    throw new Error('Config cannot have both for_each and for_each_pairs');
  }

  const tasks: Task[] = [];

  if (job.for_each) {
    const files = await fg(job.for_each.glob, { dot: false });
    for (const file of files) {
      const ext = path.extname(file).slice(1); // without dot
      const basename = path.basename(file, path.extname(file));
      const outName = substituteFilename(job.output.filename, { basename, ext });
      const outPath = path.join(job.output.directory, outName);

      tasks.push({
        id: generateId(),
        inputFiles: [file],
        outputFile: outPath,
        steps: job.steps,
        basename
      });
    }
  } else if (job.for_each_pairs) {
    const vp = job.for_each_pairs.video_pattern;
    const ap = job.for_each_pairs.audio_pattern;

    const videoFiles = await fg(vp, { dot: false });
    const audioFiles = await fg(ap, { dot: false });

    const audioMap = new Map<string, string>();
    for (const a of audioFiles) {
      const base = path.basename(a, path.extname(a));
      audioMap.set(base, a);
    }

    for (const v of videoFiles) {
      const base = path.basename(v, path.extname(v));
      const audio = audioMap.get(base);
      if (!audio) continue; // or warn

      const ext = path.extname(v).slice(1);
      const outName = substituteFilename(job.output.filename, { basename: base, ext });
      const outPath = path.join(job.output.directory, outName);

      tasks.push({
        id: generateId(),
        inputFiles: [v, audio],
        outputFile: outPath,
        steps: job.steps,
        basename: base
      });
    }
  } else {
    throw new Error('Config must have either for_each or for_each_pairs');
  }

  return {
    jobName: job.name,
    tasks
  };
}

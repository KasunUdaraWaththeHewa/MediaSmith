import fg from 'fast-glob';
import path from 'path';
import { JobConfigValidated } from '../yaml/schema';
import { PlannedJob, Task } from '../domain/Job';
import crypto from 'crypto';
import { logger } from '../logger';

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function normalizeBasename(
  basename: string,
  removePrefix?: string,
  removeSuffix?: string
): string {
  let normalized = basename;
  if (removePrefix && normalized.startsWith(removePrefix)) {
    normalized = normalized.slice(removePrefix.length);
  }
  if (removeSuffix && normalized.endsWith(removeSuffix)) {
    normalized = normalized.slice(0, -removeSuffix.length);
  }
  return normalized;
}

function substituteFilename(
  pattern: string,
  params: { basename: string; ext: string }
): string {
  return pattern
    .replace('{basename}', params.basename)
    .replace('{ext}', params.ext);
}

export async function planJob(
  config: JobConfigValidated,
  onLog?: (msg: string) => void
): Promise<PlannedJob> {
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
      const outName = substituteFilename(job.output.filename, {
        basename,
        ext,
      });
      const outPath = path.join(job.output.directory, outName);

      tasks.push({
        id: generateId(),
        inputFiles: [file],
        outputFile: outPath,
        steps: job.steps,
        basename,
      });
    }
  } else if (job.for_each_pairs) {
    const vp = job.for_each_pairs.video_pattern;
    const ap = job.for_each_pairs.audio_pattern;
    const pairBy = job.for_each_pairs.pair_by;
    const normalize = job.for_each_pairs.normalize;

    const videoFiles = await fg(vp, { dot: false });
    const audioFiles = await fg(ap, { dot: false });

    const audioMap = new Map<string, string>();
    for (const a of audioFiles) {
      const base = path.basename(a, path.extname(a));
      const normalized =
        pairBy === 'normalized_basename'
          ? normalizeBasename(
              base,
              normalize?.audio?.remove_prefix,
              normalize?.audio?.remove_suffix
            )
          : base;
      audioMap.set(normalized, a);
    }

    for (const v of videoFiles) {
      const base = path.basename(v, path.extname(v));
      const normalized =
        pairBy === 'normalized_basename'
          ? normalizeBasename(
              base,
              normalize?.video?.remove_prefix,
              normalize?.video?.remove_suffix
            )
          : base;
      const audio = audioMap.get(normalized);
      if (!audio) {
        onLog?.(`No audio found for video: ${v}`);
        continue; // or warn
      }

      const ext = path.extname(v).slice(1);
      const outName = substituteFilename(job.output.filename, {
        basename: normalized,
        ext,
      });
      const outPath = path.join(job.output.directory, outName);

      tasks.push({
        id: generateId(),
        inputFiles: [v, audio],
        outputFile: outPath,
        steps: job.steps,
        basename: normalized,
      });
    }
  } else {
    throw new Error('Config must have either for_each or for_each_pairs');
  }

  return {
    jobName: job.name,
    tasks,
  };
}

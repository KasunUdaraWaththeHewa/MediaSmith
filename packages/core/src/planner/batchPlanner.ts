import crypto from 'crypto';
import path from 'path';
import fg from 'fast-glob';
import type { PlannedJob, Task } from '../domain/Job';
import type { JobConfigValidated } from '../yaml/schema';

type Job = JobConfigValidated['job'];
type Pairing = NonNullable<Job['for_each_pairs']>;

function basenameOf(file: string): string {
  return path.basename(file, path.extname(file));
}

function pairingKey(file: string, pairing: Pairing, kind: 'video' | 'audio'): string {
  let name = basenameOf(file);
  if (pairing.pair_by === 'basename') return name;

  const rule = pairing.normalize?.[kind];
  if (rule?.remove_prefix && name.startsWith(rule.remove_prefix)) {
    name = name.slice(rule.remove_prefix.length);
  }
  if (rule?.remove_suffix && name.endsWith(rule.remove_suffix)) {
    name = name.slice(0, -rule.remove_suffix.length);
  }
  return name;
}

function makeTask(inputFiles: string[], basename: string, job: Job): Task {
  const extension = path.extname(inputFiles[0]).slice(1);
  const filename = job.output.filename
    .split('{basename}').join(basename)
    .split('{ext}').join(extension);

  return {
    id: crypto.randomBytes(8).toString('hex'),
    inputFiles,
    outputFile: path.join(job.output.directory, filename),
    steps: job.steps,
    settings: job.settings,
    basename
  };
}

async function planSingleFiles(job: Job, pattern: string): Promise<Task[]> {
  const files = (await fg(pattern, { dot: false })).sort();
  if (files.length === 0) throw new Error(`No input files match ${pattern}`);
  return files.map(file => makeTask([file], basenameOf(file), job));
}

async function planPairedFiles(job: Job, pairing: Pairing): Promise<Task[]> {
  const { video_pattern: videoPattern, audio_pattern: audioPattern } = pairing;
  const [videoFiles, audioFiles] = await Promise.all([
    fg(videoPattern, { dot: false }),
    fg(audioPattern, { dot: false })
  ]);
  videoFiles.sort();
  audioFiles.sort();
  if (videoFiles.length === 0) throw new Error(`No video files match ${videoPattern}`);
  if (audioFiles.length === 0) throw new Error(`No audio files match ${audioPattern}`);

  const audioByKey = new Map<string, string>();
  for (const audio of audioFiles) {
    const key = pairingKey(audio, pairing, 'audio');
    const previous = audioByKey.get(key);
    if (previous) throw new Error(`Ambiguous audio pairing key "${key}": ${previous}, ${audio}`);
    audioByKey.set(key, audio);
  }

  const tasks: Task[] = [];
  const matchedAudio = new Set<string>();
  const unmatchedVideos: string[] = [];
  for (const video of videoFiles) {
    const key = pairingKey(video, pairing, 'video');
    const audio = audioByKey.get(key);
    if (!audio) {
      unmatchedVideos.push(video);
      continue;
    }
    matchedAudio.add(audio);
    tasks.push(makeTask([video, audio], key, job));
  }

  const unmatchedAudio = audioFiles.filter(audio => !matchedAudio.has(audio));
  if (unmatchedVideos.length || unmatchedAudio.length) {
    throw new Error(
      `Unmatched media pairs: ${unmatchedVideos.length} video(s), ${unmatchedAudio.length} audio file(s). ` +
      `Videos: ${unmatchedVideos.join(', ') || 'none'}; audio: ${unmatchedAudio.join(', ') || 'none'}`
    );
  }
  return tasks;
}

export async function planJob(config: JobConfigValidated): Promise<PlannedJob> {
  const { job } = config;
  if (job.for_each && job.for_each_pairs) {
    throw new Error('Config cannot have both for_each and for_each_pairs');
  }

  let tasks: Task[];
  if (job.for_each) {
    tasks = await planSingleFiles(job, job.for_each.glob);
  } else if (job.for_each_pairs) {
    tasks = await planPairedFiles(job, job.for_each_pairs);
  } else {
    throw new Error('Config must have either for_each or for_each_pairs');
  }

  return { jobName: job.name, tasks };
}

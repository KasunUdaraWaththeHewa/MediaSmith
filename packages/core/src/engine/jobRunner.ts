import type { JobConfigValidated } from '../yaml/schema';
import type { PreparedJob } from '../domain/Job';
import { planJob } from '../planner/batchPlanner';
import { runTask, RunOptions } from './taskRunner';
import { validatePlan } from './planValidator';
import { errorMessage, MediaSmithError } from '../errors';
import { defaultMediaProcessRunner } from '../ffmpeg/processRunner';
import { preflightJob } from './preflight';

export type { RunOptions } from './taskRunner';

export async function runJobFromConfig(
  config: JobConfigValidated,
  opts: RunOptions = {}
): Promise<void> {
  opts.signal?.throwIfAborted();
  let job: PreparedJob;
  try {
    job = validatePlan(await planJob(config));
  } catch (error) {
    throw new MediaSmithError('PLAN', errorMessage(error), { jobName: config.job.name }, error);
  }
  opts.onLog?.(`Planning job "${job.jobName}" (${job.tasks.length} tasks)`);
  const processes = opts.processRunner ?? defaultMediaProcessRunner;
  const probes = await preflightJob(job, processes, opts.signal);
  for (const task of job.tasks) {
    await runTask(task, opts, probes.get(task.inputs.primary));
  }
  opts.signal?.throwIfAborted();
  opts.onLog?.('Job complete');
}

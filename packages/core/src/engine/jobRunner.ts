import type { JobConfigValidated } from '../yaml/schema';
import type { PreparedJob } from '../domain/Job';
import { planJob } from '../planner/batchPlanner';
import { runTask, RunOptions } from './taskRunner';
import { validatePlan } from './planValidator';
import { errorMessage, MediaSmithError } from '../errors';

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
  for (const task of job.tasks) {
    await runTask(task, opts);
  }
  opts.signal?.throwIfAborted();
  opts.onLog?.('Job complete');
}

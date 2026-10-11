import type { JobConfigValidated } from '../yaml/schema';
import { planJob } from '../planner/batchPlanner';
import { runTask, RunOptions } from './taskRunner';
import { validatePlan } from './planValidator';

export type { RunOptions } from './taskRunner';

export async function runJobFromConfig(
  config: JobConfigValidated,
  opts: RunOptions = {}
): Promise<void> {
  const job = await planJob(config);
  opts.onLog?.(`Planning job "${job.jobName}" (${job.tasks.length} tasks)`);
  validatePlan(job);
  for (const task of job.tasks) {
    await runTask(task, opts);
  }
  opts.onLog?.('Job complete');
}

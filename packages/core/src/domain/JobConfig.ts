import type { JobConfigValidated } from '../yaml/schema';

// Keep the public domain name while deriving its shape from the runtime schema.
export type JobConfig = JobConfigValidated;
export type ForEachGlob = NonNullable<JobConfig['job']['for_each']>;
export type ForEachPairs = NonNullable<JobConfig['job']['for_each_pairs']>;
export type OutputPattern = JobConfig['job']['output'];

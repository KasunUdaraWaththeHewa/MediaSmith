import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { JobSchema, JobConfigValidated } from './schema';
import { applyOverrides } from './overrides';

export async function loadJobConfig(configPath: string, overrides: string[] = []): Promise<JobConfigValidated> {
  const full = path.resolve(process.cwd(), configPath);
  const raw = await fs.promises.readFile(full, 'utf-8');
  const parsed = applyOverrides(YAML.parse(raw), overrides);
  const res = JobSchema.safeParse(parsed);

  if (!res.success) {
    const msg = res.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Invalid job config:\n${msg}`);
  }

  return res.data;
}

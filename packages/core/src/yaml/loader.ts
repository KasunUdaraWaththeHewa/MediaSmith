import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { JobSchema } from './schema';
import type { JobConfigValidated } from './schema';
import { applyOverrides } from './overrides';
import { errorMessage, MediaSmithError } from '../errors';

export async function loadJobConfig(
  configPath: string,
  overrides: string[] = []
): Promise<JobConfigValidated> {
  const full = path.resolve(process.cwd(), configPath);
  let raw: string;
  try {
    raw = await fs.promises.readFile(full, 'utf-8');
  } catch (error) {
    throw new MediaSmithError(
      'CONFIG',
      `Could not read job config ${full}: ${errorMessage(error)}`,
      { configPath: full },
      error
    );
  }

  let parsed: unknown;
  try {
    // Apply CLI overrides before schema validation so both YAML and overrides follow the same rules.
    parsed = applyOverrides(YAML.parse(raw), overrides);
  } catch (error) {
    throw new MediaSmithError(
      'CONFIG',
      `Invalid job config ${full}: ${errorMessage(error)}`,
      { configPath: full },
      error
    );
  }
  const res = JobSchema.safeParse(parsed);

  if (!res.success) {
    const msg = res.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
    throw new MediaSmithError(
      'CONFIG',
      `Invalid job config:\n${msg}`,
      {
        configPath: full,
        fieldPath: res.error.issues[0]?.path.join('.')
      },
      res.error
    );
  }

  return res.data;
}

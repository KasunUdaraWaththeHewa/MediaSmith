import type { ConfigOptions } from './options';
import { executeJob } from './execute';

export async function runCommand(configPath: string, options: ConfigOptions = {}): Promise<void> {
  await executeJob(configPath, options, false);
}

import { loadJobConfig, runJobFromConfig } from '@mediasmith/core';
import type { ConfigOptions } from './options';

export async function executeJob(
  configPath: string,
  options: ConfigOptions,
  dryRun: boolean
): Promise<void> {
  try {
    const config = await loadJobConfig(configPath, options.set);
    await runJobFromConfig(config, {
      dryRun,
      onLog: message => console.log(message)
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

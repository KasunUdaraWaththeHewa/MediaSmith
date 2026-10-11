import { loadJobConfig, runJobFromConfig } from '@mediasmith/core';
import { ConfigOptions } from './options';

export async function runCommand(configPath: string, options: ConfigOptions = {}) {
  try {
    const config = await loadJobConfig(configPath, options.set);
    await runJobFromConfig(config, {
      onLog: (msg) => console.log(msg)
    });
  } catch (err: unknown) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

import { loadJobConfig } from '@mediasmith/core';
import { ConfigOptions } from './options';

export async function validateCommand(configPath: string, options: ConfigOptions = {}) {
  try {
    await loadJobConfig(configPath, options.set);
    console.log('Config is valid ✅');
  } catch (err: unknown) {
    console.error('Invalid config ❌');
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

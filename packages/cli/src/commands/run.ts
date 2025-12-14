import { loadJobConfig, runJobFromConfig, logger } from '@mediasmith/core';

export async function runCommand(configPath: string) {
  try {
    const config = await loadJobConfig(configPath);
    await runJobFromConfig(config, {
      onLog: logger.info,
    });
  } catch (err: any) {
    logger.error(`Error: ${err.message ?? err}`);
    process.exit(1);
  }
}

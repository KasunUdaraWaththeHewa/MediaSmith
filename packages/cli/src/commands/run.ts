import { loadJobConfig, runJobFromConfig } from '@mediasmith/core';

export async function runCommand(configPath: string) {
  try {
    const config = await loadJobConfig(configPath);
    await runJobFromConfig(config, {
      onLog: (msg) => console.log(msg)
    });
  } catch (err: any) {
    console.error('Error:', err.message ?? err);
    process.exit(1);
  }
}

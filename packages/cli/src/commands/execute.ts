import { loadJobConfig, runJobFromConfig } from '@mediasmith/core';
import type { ConfigOptions } from './options';

export async function executeJob(
  configPath: string,
  options: ConfigOptions,
  dryRun: boolean
): Promise<void> {
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  // Scope signal handlers to this command; the core runner performs process and file cleanup.
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    const config = await loadJobConfig(configPath, options.set);
    await runJobFromConfig(config, {
      dryRun,
      signal: controller.signal,
      onLog: (message) => console.log(message)
    });
  } catch (error) {
    console.error(
      controller.signal.aborted
        ? 'Cancelled'
        : `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = controller.signal.aborted ? 130 : 1;
  } finally {
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
  }
}

import { loadJobConfig } from '@mediasmith/core';

export async function validateCommand(configPath: string) {
  try {
    await loadJobConfig(configPath);
    console.log('Config is valid ✅');
  } catch (err: any) {
    console.error('Invalid config ❌');
    console.error(err.message ?? err);
    process.exit(1);
  }
}

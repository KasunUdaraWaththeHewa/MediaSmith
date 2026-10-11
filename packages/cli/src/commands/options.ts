export interface ConfigOptions {
  set?: string[];
}

export function collectSet(value: string, previous: string[]): string[] {
  return [...previous, value];
}

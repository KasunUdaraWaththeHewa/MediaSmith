type ObjectValue = Record<string, unknown>;

function parseValue(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(raw)) return Number(raw);
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON override value: ${raw}`);
    }
  }
  return raw;
}

function isObject(value: unknown): value is ObjectValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getChild(container: unknown, key: string): unknown {
  if (Array.isArray(container)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= container.length) {
      throw new Error(`Array index ${key} is out of range`);
    }
    return container[index];
  }
  if (!isObject(container)) throw new Error(`Cannot traverse override path at ${key}`);
  return container[key];
}

function setChild(container: unknown, key: string, value: unknown): void {
  if (Array.isArray(container)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= container.length) {
      throw new Error(`Array index ${key} is out of range`);
    }
    container[index] = value;
    return;
  }
  if (!isObject(container)) throw new Error(`Cannot set override path at ${key}`);
  container[key] = value;
}

export function applyOverrides(config: unknown, overrides: string[]): unknown {
  if (overrides.length === 0) return config;
  if (!isObject(config) || !isObject(config.job))
    throw new Error('Overrides require a YAML job object');

  for (const assignment of overrides) {
    const equals = assignment.indexOf('=');
    if (equals <= 0) throw new Error(`Override must be path=value: ${assignment}`);
    const rawPath = assignment.slice(0, equals);
    const fieldPath = rawPath.startsWith('job.') ? rawPath.slice(4) : rawPath;
    const parts = fieldPath.split('.');
    if (
      parts.some(
        (part) =>
          !/^(?:[A-Za-z_][A-Za-z0-9_-]*|\d+)$/.test(part) ||
          ['__proto__', 'constructor', 'prototype'].includes(part)
      )
    ) {
      throw new Error(`Invalid override path: ${rawPath}`);
    }

    let current: unknown = config.job;
    for (const part of parts.slice(0, -1)) {
      let next = getChild(current, part);
      if (next === undefined) {
        if (parts[0] !== 'settings') throw new Error(`Override path does not exist: ${rawPath}`);
        next = {};
        setChild(current, part, next);
      }
      current = next;
    }
    setChild(current, parts[parts.length - 1], parseValue(assignment.slice(equals + 1)));
  }
  return config;
}

export type MediaSmithErrorCode = 'CONFIG' | 'PLAN' | 'TASK' | 'PROCESS';

export interface ErrorContext {
  configPath?: string;
  fieldPath?: string;
  jobName?: string;
  taskId?: string;
  stepIndex?: number;
  action?: string;
  command?: string;
  exitCode?: number | null;
}

export class MediaSmithError extends Error {
  readonly code: MediaSmithErrorCode;
  readonly context: Readonly<ErrorContext>;
  readonly cause?: unknown;

  constructor(
    code: MediaSmithErrorCode,
    message: string,
    context: ErrorContext = {},
    cause?: unknown
  ) {
    super(message);
    this.name = 'MediaSmithError';
    this.code = code;
    this.context = context;
    this.cause = cause;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

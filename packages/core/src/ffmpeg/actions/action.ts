import { z } from 'zod';
import type { VideoProbeInfo } from '../ffprobe';
import type { JobSettings } from '../../yaml/settings';

export interface StepContext {
  inputFiles: string[];
  outputFile: string;
  probe?: VideoProbeInfo;
  settings?: JobSettings;
}

export interface ActionValidationIssue {
  path: string[];
  message: string;
}

export interface ActionDefinition {
  schema: z.ZodTypeAny;
  inputKind: 'video' | 'audio';
  outputKind: 'video' | 'audio';
  needsProbe: boolean;
  needsExternalAudio: boolean;
  outputExtensions(step: unknown): readonly string[];
  defaultExtension(step: unknown): string;
  buildArgs(step: unknown, context: StepContext): string[];
  validateJobStep?(step: unknown, settings?: JobSettings): ActionValidationIssue | undefined;
  validateOutput?(step: unknown, outputFile: string): Promise<void>;
}

interface ActionOptions<S extends z.ZodTypeAny> {
  inputKind: 'video' | 'audio';
  outputKind: 'video' | 'audio';
  outputExtensions: (step: z.infer<S>) => readonly string[];
  defaultExtension: (step: z.infer<S>) => string;
  needsProbe?: boolean;
  needsExternalAudio?: boolean;
  validateJobStep?: (step: z.infer<S>, settings?: JobSettings) => ActionValidationIssue | undefined;
  validateOutput?: (step: z.infer<S>, outputFile: string) => Promise<void>;
}

export function defineAction<S extends z.ZodTypeAny>(
  schema: S,
  buildArgs: (step: z.infer<S>, context: StepContext) => string[],
  options: ActionOptions<S>
): ActionDefinition {
  const validateJobStep = options.validateJobStep;
  const validateOutput = options.validateOutput;
  return {
    schema,
    inputKind: options.inputKind,
    outputKind: options.outputKind,
    needsProbe: options.needsProbe ?? false,
    needsExternalAudio: options.needsExternalAudio ?? false,
    outputExtensions: step => options.outputExtensions(schema.parse(step)),
    defaultExtension: step => options.defaultExtension(schema.parse(step)),
    buildArgs: (step, context) => buildArgs(schema.parse(step), context),
    validateJobStep: validateJobStep
      ? (step, settings) => validateJobStep(schema.parse(step), settings)
      : undefined,
    validateOutput: validateOutput
      ? (step, outputFile) => validateOutput(schema.parse(step), outputFile)
      : undefined
  };
}

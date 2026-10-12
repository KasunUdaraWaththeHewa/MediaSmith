import { z } from 'zod';
import type { VideoProbeInfo } from '../ffprobe';
import type { JobSettings } from '../../yaml/settings';
import type { TaskInputs } from '../../domain/Inputs';

export interface StepContext {
  inputs: TaskInputs;
  outputFile: string;
  probe?: VideoProbeInfo;
  settings?: JobSettings;
}

export interface ActionValidationIssue {
  path: string[];
  message: string;
}

export interface PreparedActionStep {
  inputKind: 'video' | 'audio';
  outputKind: 'video' | 'audio';
  needsProbe: boolean;
  needsExternalAudio: boolean;
  outputExtensions: readonly string[];
  defaultExtension: string;
  buildArgs(context: StepContext): string[];
  validateJobStep(settings?: JobSettings): ActionValidationIssue | undefined;
  validateOutput(outputFile: string): Promise<void>;
  estimateProbe(probe: VideoProbeInfo, settings?: JobSettings): VideoProbeInfo | undefined;
}

export type PreparedActionResult<S> =
  | { success: true; data: PreparedActionStep; parsedStep: S }
  | { success: false; issues: z.ZodIssue[] };

export interface ActionDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  schema: S;
  inputKind: 'video' | 'audio';
  outputKind: 'video' | 'audio';
  needsProbe: boolean;
  needsExternalAudio: boolean;
  prepare(step: unknown): PreparedActionStep;
  tryPrepare(step: unknown): PreparedActionResult<z.infer<S>>;
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
  estimateProbe?: (
    step: z.infer<S>,
    probe: VideoProbeInfo,
    settings?: JobSettings
  ) => VideoProbeInfo | undefined;
}

export function defineAction<S extends z.ZodTypeAny>(
  schema: S,
  buildArgs: (step: z.infer<S>, context: StepContext) => string[],
  options: ActionOptions<S>
): ActionDefinition<S> {
  const validateJobStep = options.validateJobStep;
  const validateOutput = options.validateOutput;
  function prepared(parsed: z.infer<S>): PreparedActionStep {
    // Bind the validated step to its hooks so runners need no action-specific branches.
    return {
      inputKind: options.inputKind,
      outputKind: options.outputKind,
      needsProbe: options.needsProbe ?? false,
      needsExternalAudio: options.needsExternalAudio ?? false,
      outputExtensions: options.outputExtensions(parsed),
      defaultExtension: options.defaultExtension(parsed),
      buildArgs: (context) => buildArgs(parsed, context),
      validateJobStep: (settings) => validateJobStep?.(parsed, settings),
      validateOutput: (outputFile) => validateOutput?.(parsed, outputFile) ?? Promise.resolve(),
      estimateProbe: (probe, settings) => options.estimateProbe?.(parsed, probe, settings)
    };
  }

  return {
    schema,
    inputKind: options.inputKind,
    outputKind: options.outputKind,
    needsProbe: options.needsProbe ?? false,
    needsExternalAudio: options.needsExternalAudio ?? false,
    prepare: (step) => prepared(schema.parse(step)),
    tryPrepare(step): PreparedActionResult<z.infer<S>> {
      const result = schema.safeParse(step);
      return result.success
        ? { success: true, data: prepared(result.data), parsedStep: result.data }
        : { success: false, issues: result.error.issues };
    }
  };
}

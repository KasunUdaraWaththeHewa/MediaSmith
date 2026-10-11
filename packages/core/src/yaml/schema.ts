import { z } from 'zod';
import path from 'path';
import { getActionDefinition } from '../ffmpeg/actions';
import { JobSettingsSchema } from './settings';

function validateStep(step: { action: string }, context: z.RefinementCtx): void {
  const definition = getActionDefinition(step.action);
  if (!definition) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['action'],
      message: `Unknown or unimplemented action: ${step.action}`
    });
    return;
  }
  const result = definition.tryPrepare(step);
  if (!result.success) {
    for (const issue of result.issues) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: issue.path, message: issue.message });
    }
  }
}

export const StepSchema = z.object({ action: z.string() }).passthrough().superRefine(validateStep);

export const ForEachGlobSchema = z
  .object({
    glob: z.string().min(1)
  })
  .strict();

export const ForEachPairsSchema = z
  .object({
    video_pattern: z.string().min(1),
    audio_pattern: z.string().min(1),
    pair_by: z.enum(['basename', 'normalized_basename']),
    normalize: z
      .object({
        video: z
          .object({
            remove_prefix: z.string().optional(),
            remove_suffix: z.string().optional()
          })
          .strict()
          .optional(),
        audio: z
          .object({
            remove_prefix: z.string().optional(),
            remove_suffix: z.string().optional()
          })
          .strict()
          .optional()
      })
      .strict()
      .optional()
  })
  .strict();

export const OutputPatternSchema = z
  .object({
    directory: z.string().min(1),
    filename: z.string().min(1)
  })
  .strict()
  .superRefine((output, ctx) => {
    const withoutPlaceholders = output.filename.replace(/\{basename\}|\{ext\}/g, '');
    if (/[{}]/.test(withoutPlaceholders)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['filename'],
        message: 'Only {basename} and {ext} filename placeholders are supported'
      });
    }
    if (/[{}]/.test(output.directory)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['directory'],
        message: 'Output directory does not support placeholders'
      });
    }
    if (
      path.isAbsolute(output.filename) ||
      path.win32.isAbsolute(output.filename) ||
      output.filename.split(/[\\/]/).includes('..')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['filename'],
        message: 'Output filename must stay within the output directory'
      });
    }
  });

const JobFieldsSchema = z
  .object({
    name: z.string().min(1),
    for_each: ForEachGlobSchema.optional(),
    for_each_pairs: ForEachPairsSchema.optional(),
    output: OutputPatternSchema,
    settings: JobSettingsSchema.optional(),
    steps: z.array(StepSchema).min(1)
  })
  .strict();

type JobFields = z.infer<typeof JobFieldsSchema>;

function validateSelection(job: JobFields, context: z.RefinementCtx): void {
  if (Boolean(job.for_each) === Boolean(job.for_each_pairs)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Specify exactly one of for_each or for_each_pairs'
    });
  }

  const usesExternalAudio = job.steps.some(
    (step) => getActionDefinition(step.action)?.needsExternalAudio
  );
  if (job.for_each && usesExternalAudio) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['steps'],
      message: 'merge_audio requires for_each_pairs'
    });
  }
  if (job.for_each_pairs && !usesExternalAudio) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['steps'],
      message: 'for_each_pairs requires an action that uses external audio'
    });
  }
}

function validateActionSettings(job: JobFields, context: z.RefinementCtx): void {
  for (const [index, step] of job.steps.entries()) {
    const action = getActionDefinition(step.action);
    if (!action) continue;
    const prepared = action.tryPrepare(step);
    if (!prepared.success) continue;
    const issue = prepared.data.validateJobStep(job.settings);
    if (issue) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['steps', index, ...issue.path],
        message: issue.message
      });
    }
  }
}

function validateOutputExtension(job: JobFields, context: z.RefinementCtx): void {
  const finalStep = job.steps[job.steps.length - 1];
  const finalAction = finalStep && getActionDefinition(finalStep.action);
  if (!finalAction) return;
  const prepared = finalAction.tryPrepare(finalStep);
  if (!prepared.success) return;

  const extension = job.output.filename.slice(job.output.filename.lastIndexOf('.')).toLowerCase();
  if (extension === '.{ext}') return;

  const supportedExtensions = prepared.data.outputExtensions;
  if (!supportedExtensions.includes(extension)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['output', 'filename'],
      message: `Output extension must be ${supportedExtensions.join(' or ')} for ${finalStep.action}`
    });
  }
}

const JobBodySchema = JobFieldsSchema.superRefine((job, context) => {
  validateSelection(job, context);
  validateActionSettings(job, context);
  validateOutputExtension(job, context);
});

export const JobSchema = z
  .object({
    version: z.literal(1),
    job: JobBodySchema
  })
  .strict();

export type JobConfigValidated = z.infer<typeof JobSchema>;

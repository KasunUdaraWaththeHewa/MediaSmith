import type { z } from 'zod';
import type { ActionDefinition, PreparedActionStep, StepContext } from './action';
import { compressVideoAction } from './compressVideo';
import { mergeAudioAction } from './mergeAudio';
import { extractAudioAction } from './extractAudio';

// Register new actions here. Each action owns its validation and command builder.
const actions = {
  compress_video: compressVideoAction,
  merge_audio: mergeAudioAction,
  extract_audio: extractAudioAction
} satisfies Record<string, ActionDefinition>;

export type RegisteredActionStep = z.infer<(typeof actions)[keyof typeof actions]['schema']>;
type RegisteredActionDefinition = (typeof actions)[keyof typeof actions];

function isRegisteredAction(action: string): action is keyof typeof actions {
  return Object.prototype.hasOwnProperty.call(actions, action);
}

export function getActionDefinition(action: string): RegisteredActionDefinition | undefined {
  return isRegisteredAction(action) ? actions[action] : undefined;
}

export function prepareActionStep(step: { action: string }): PreparedActionStep {
  const definition = getActionDefinition(step.action);
  if (!definition) throw new Error(`Unknown or unimplemented action: ${step.action}`);
  return definition.prepare(step);
}

export function buildArgsForStep(step: { action: string }, context: StepContext): string[] {
  return prepareActionStep(step).buildArgs(context);
}

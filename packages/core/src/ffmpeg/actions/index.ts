import { ActionDefinition, StepContext } from './action';
import { compressVideoAction } from './compressVideo';
import { mergeAudioAction } from './mergeAudio';
import { extractAudioAction } from './extractAudio';

// Register new actions here. Each action owns its validation and command builder.
const actions: Record<string, ActionDefinition> = {
  compress_video: compressVideoAction,
  merge_audio: mergeAudioAction,
  extract_audio: extractAudioAction
};

export function getActionDefinition(action: string): ActionDefinition | undefined {
  return actions[action];
}

export function buildArgsForStep(step: { action: string }, context: StepContext): string[] {
  const definition = getActionDefinition(step.action);
  if (!definition) throw new Error(`Unknown or unimplemented action: ${step.action}`);
  return definition.buildArgs(step, context);
}

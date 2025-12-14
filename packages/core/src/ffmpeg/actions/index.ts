import { BaseStep } from '../../domain/Step';
import { VideoProbeInfo } from '../ffprobe';
import { ActionRegistry } from './ActionRegistry';
import { CompressVideoStep, buildCompressVideoArgs } from './compressVideo';
import { MergeAudioStep, buildMergeAudioArgs } from './mergeAudio';

export interface StepContext {
  inputFiles: string[];   // [video] or [video,audio]
  outputFile: string;
  probe?: VideoProbeInfo;
}

const registry = new ActionRegistry();

// Register handlers
registry.register('compress_video', {
  buildArgs: (step: BaseStep, ctx: StepContext) => {
    if (!ctx.probe || ctx.inputFiles.length < 1) {
      throw new Error('compress_video requires probe and one input file');
    }
    return buildCompressVideoArgs(
      step as CompressVideoStep,
      ctx.inputFiles[0],
      ctx.outputFile,
      ctx.probe
    );
  }
});

registry.register('merge_audio', {
  buildArgs: (step: BaseStep, ctx: StepContext) => {
    if (ctx.inputFiles.length < 2) {
      throw new Error('merge_audio requires video + audio');
    }
    return buildMergeAudioArgs(
      step as MergeAudioStep,
      ctx.inputFiles[0],
      ctx.inputFiles[1],
      ctx.outputFile
    );
  }
});

export function buildArgsForStep(step: BaseStep, ctx: StepContext): string[] {
  const handler = registry.getHandler(step.action);
  if (!handler) {
    throw new Error(`Unknown or unimplemented action: ${step.action}`);
  }
  return handler.buildArgs(step, ctx);
}

import { BaseStep } from '../../domain/Step';
import { VideoProbeInfo } from '../ffprobe';
import { CompressVideoStep, buildCompressVideoArgs } from './compressVideo';
import { MergeAudioStep, buildMergeAudioArgs } from './mergeAudio';

export interface StepContext {
  inputFiles: string[];   // [video] or [video,audio]
  outputFile: string;
  probe?: VideoProbeInfo;
}

export function buildArgsForStep(step: BaseStep, ctx: StepContext): string[] {
  switch (step.action) {
    case 'compress_video':
      if (!ctx.probe || ctx.inputFiles.length < 1) {
        throw new Error('compress_video requires probe and one input file');
      }
      return buildCompressVideoArgs(
        step as CompressVideoStep,
        ctx.inputFiles[0],
        ctx.outputFile,
        ctx.probe
      );

    case 'merge_audio':
      if (ctx.inputFiles.length < 2) {
        throw new Error('merge_audio requires video + audio');
      }
      return buildMergeAudioArgs(
        step as MergeAudioStep,
        ctx.inputFiles[0],
        ctx.inputFiles[1],
        ctx.outputFile
      );

    default:
      throw new Error(`Unknown or unimplemented action: ${step.action}`);
  }
}

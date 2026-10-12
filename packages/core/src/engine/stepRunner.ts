import type { PreparedStep } from '../domain/Job';
import type { TaskInputs } from '../domain/Inputs';
import type { JobSettings } from '../yaml/settings';
import type { VideoProbeInfo } from '../ffmpeg/ffprobe';
import type { MediaProcessRunner } from '../ffmpeg/processRunner';
import type { RunOptions } from './options';

export interface StepExecution {
  step: PreparedStep;
  stepIndex: number;
  inputs: TaskInputs;
  outputFile: string;
  settings?: JobSettings;
  previewProbe?: VideoProbeInfo;
  options: RunOptions;
  processes: MediaProcessRunner;
}

export async function runStep(execution: StepExecution): Promise<VideoProbeInfo | undefined> {
  const { step, stepIndex, inputs, outputFile, settings, previewProbe, options, processes } =
    execution;
  const action = step.handler;
  options.signal?.throwIfAborted();

  const probe =
    action.needsProbe || action.needsPrimaryAudio
      ? options.dryRun
        ? previewProbe
        : (previewProbe ?? (await processes.probeVideo(inputs.primary, { signal: options.signal })))
      : undefined;
  if ((action.needsProbe || action.needsPrimaryAudio) && !probe) {
    throw new Error(`Cannot inspect media metadata for step ${stepIndex + 1} (${step.action})`);
  }
  if (action.needsPrimaryAudio && !probe?.hasAudio) {
    throw new Error(
      `Step ${stepIndex + 1} (${step.action}) requires an audio stream in ${inputs.primary}`
    );
  }

  const args = action.buildArgs({ inputs, outputFile, probe, settings });
  options.onLog?.(`Running step "${step.action}"...`);
  await processes.runFfmpeg(args, options);
  options.signal?.throwIfAborted();

  if (!options.dryRun) {
    // Check this step's file now; a later action may produce a different format or size.
    await action.validateOutput(outputFile);
  }
  return options.dryRun && previewProbe ? action.estimateProbe(previewProbe, settings) : undefined;
}

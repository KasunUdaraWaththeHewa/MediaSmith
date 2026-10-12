import type { PreparedJob } from '../domain/Job';
import type { VideoProbeInfo } from '../ffmpeg/ffprobe';
import type { MediaProcessRunner } from '../ffmpeg/processRunner';
import { errorMessage, MediaSmithError } from '../errors';

export async function preflightJob(
  job: PreparedJob,
  processes: MediaProcessRunner,
  signal?: AbortSignal
): Promise<Map<string, VideoProbeInfo>> {
  const probes = new Map<string, VideoProbeInfo>();

  for (const task of job.tasks) {
    signal?.throwIfAborted();
    for (const file of [task.inputs.primary, task.inputs.externalAudio].filter(
      (input): input is string => input !== undefined
    )) {
      if (probes.has(file)) continue;
      try {
        probes.set(file, await processes.probeVideo(file, { signal }));
      } catch (error) {
        throw new MediaSmithError(
          'PLAN',
          `Cannot inspect input ${file} for task ${task.id}: ${errorMessage(error)}`,
          { jobName: job.jobName, taskId: task.id },
          error
        );
      }
    }

    const primary = probes.get(task.inputs.primary);
    const firstStep = task.steps[0];
    if (!primary || !firstStep) continue;
    if (firstStep.handler.inputKind === 'video' && (primary.width <= 0 || primary.height <= 0)) {
      throw new MediaSmithError('PLAN', `Input ${task.inputs.primary} has no video stream`, {
        jobName: job.jobName,
        taskId: task.id,
        stepIndex: 0,
        action: firstStep.action
      });
    }
    if (firstStep.handler.needsPrimaryAudio && !primary.hasAudio) {
      throw new MediaSmithError('PLAN', `Input ${task.inputs.primary} has no audio stream`, {
        jobName: job.jobName,
        taskId: task.id,
        stepIndex: 0,
        action: firstStep.action
      });
    }
    if (task.inputs.externalAudio && task.steps.some((step) => step.handler.needsExternalAudio)) {
      const external = probes.get(task.inputs.externalAudio);
      if (!external?.hasAudio) {
        throw new MediaSmithError(
          'PLAN',
          `External input ${task.inputs.externalAudio} has no audio stream`,
          { jobName: job.jobName, taskId: task.id }
        );
      }
    }
  }
  signal?.throwIfAborted();
  return probes;
}

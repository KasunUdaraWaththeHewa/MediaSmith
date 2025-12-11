export interface MergeAudioStep {
  action: 'merge_audio';
  audio_source: 'external_only' | 'mix';
  original_volume?: number;
  external_volume?: number;
}

export function buildMergeAudioArgs(
  step: MergeAudioStep,
  videoPath: string,
  audioPath: string,
  outputFile: string
): string[] {
  const args: string[] = ['-hide_banner', '-y', '-i', videoPath, '-i', audioPath];

  if (step.audio_source === 'external_only') {
    args.push(
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      outputFile
    );
    return args;
  }

  const origVol = step.original_volume ?? 0.3;
  const extVol = step.external_volume ?? 1.0;

  args.push(
    '-filter_complex',
    `[0:a]volume=${origVol}[a0];[1:a]volume=${extVol}[a1];[a0][a1]amix=inputs=2:normalize=1[aout]`,
    '-map', '0:v:0',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    outputFile
  );

  return args;
}

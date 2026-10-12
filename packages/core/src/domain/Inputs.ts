export interface TaskInputs {
  primary: string;
  externalAudio?: string;
}

export function inputPaths(inputs: TaskInputs): string[] {
  return inputs.externalAudio ? [inputs.primary, inputs.externalAudio] : [inputs.primary];
}

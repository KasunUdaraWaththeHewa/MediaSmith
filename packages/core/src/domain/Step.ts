export type StepAction =
  | 'compress_video'
  | 'merge_audio'
  | 'extract_audio'
  | 'trim'
  | 'normalize_audio'
  | 'dedupe_media';

export interface BaseStep {
  action: StepAction;
  [key: string]: any;
}
